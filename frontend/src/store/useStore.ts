import { create } from 'zustand'
import { ACCOUNTS, type Account } from '@/domain/accounts'
import { refreshCaches, reportDevice, setOnline } from '@/domain/engine'
import { freshDevice, makeWorld, type PresetId } from '@/domain/presets'
import type { ServerData, World } from '@/domain/types'
import { apiGetSharedState, apiLogin, apiLogout, apiPutSharedState } from '@/lib/api'

const SERVER_KEY = 'waybill:server:v1'
const DEVICE_KEY = 'waybill:device:v1'
const SESSION_KEY = 'waybill:session:v1'
const REMEMBER_KEY = 'waybill:remember:v1'
let remoteVersion = 0

const readJSON = <T,>(storage: Storage, key: string): T | null => {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

const writeJSON = (storage: Storage, key: string, value: unknown) => {
  try {
    const next = JSON.stringify(value)
    if (storage.getItem(key) !== next) storage.setItem(key, next)
  } catch {
    // storage full or blocked: the app keeps working from memory
  }
}

function loadWorld(): World {
  const s = readJSON<ServerData>(localStorage, SERVER_KEY)
  const d = readJSON<World['d']>(sessionStorage, DEVICE_KEY)
  if (s && s.epoch) {
    const w: World = { s, d: d ?? freshDevice() }
    if (!w.d.cache || Object.keys(w.d.cache).length === 0) refreshCaches(w)
    return w
  }
  const w = makeWorld('ordering')
  return w
}

// A driver's phone only ever holds that driver's own trips. Other roles hold none.
const scopeFor = (acc: Account | null) => (acc?.role === 'driver' ? acc.vehicleId : acc ? '-' : undefined)

function loadSession(): Account | null {
  const name = readJSON<string>(sessionStorage, SESSION_KEY) ?? readJSON<string>(localStorage, REMEMBER_KEY)
  return ACCOUNTS.find((a) => a.username === name) ?? null
}

interface Store {
  world: World
  session: Account | null
  act: <T>(fn: (w: World) => T) => T
  login: (username: string, pin: string, remember?: boolean) => Promise<{ ok: boolean; reason?: string }>
  logout: () => void
  reset: (preset: PresetId) => void
  setOnline: (online: boolean) => void
  refreshRemote: () => Promise<void>
}

const initialSession = loadSession()
const initialWorld = loadWorld()
initialWorld.d.scopeVehicle = scopeFor(initialSession)
refreshCaches(initialWorld)

export const useStore = create<Store>((set, get) => ({
  world: initialWorld,
  session: initialSession,

  act: (fn) => {
    const stored = readJSON<ServerData>(localStorage, SERVER_KEY)
    const base = get().world
    const w: World = structuredClone({ s: stored && stored.epoch === base.s.epoch ? stored : base.s, d: base.d })
    const result = fn(w)
    if (w.d.online) refreshCaches(w)
    set({ world: w })
    writeJSON(localStorage, SERVER_KEY, w.s)
    writeJSON(sessionStorage, DEVICE_KEY, w.d)
    if (w.d.online && get().session) void apiPutSharedState(w.s).then((saved) => { remoteVersion = saved.version }).catch(() => undefined)
    return result
  },

  login: async (username, pin, remember) => {
    const acc = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase())
    if (!acc) return { ok: false, reason: 'We could not find that staff ID.' }
    if (acc.pin !== pin) return { ok: false, reason: 'That PIN is not right.' }

    let remoteAccount = acc
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        const remote = await apiLogin(acc.username, pin)
        remoteAccount = {
          ...acc,
          name: remote.user.name,
          title: remote.user.title,
          depot: (remote.user.depot as Account['depot']) ?? acc.depot,
          vehicleId: remote.user.vehicleId ?? acc.vehicleId,
          outletId: remote.user.outletId ?? acc.outletId,
        }
      } catch (cause) {
        return { ok: false, reason: cause instanceof Error ? cause.message : 'The backend is unavailable.' }
      }
    }

    writeJSON(sessionStorage, SESSION_KEY, acc.username)
    if (remember) writeJSON(localStorage, REMEMBER_KEY, acc.username)
    set({ session: remoteAccount })
    const loggedInWorld = get().world
    loggedInWorld.d.scopeVehicle = scopeFor(remoteAccount)
    writeJSON(sessionStorage, DEVICE_KEY, loggedInWorld.d)
    try {
      const remoteState = await apiGetSharedState()
      if (remoteState?.state) {
        remoteVersion = remoteState.version
        const next: World = { s: remoteState.state, d: get().world.d }
        next.d.scopeVehicle = scopeFor(remoteAccount)
        if (next.d.online) refreshCaches(next)
        set({ world: next })
        writeJSON(localStorage, SERVER_KEY, next.s)
        writeJSON(sessionStorage, DEVICE_KEY, next.d)
      } else {
        const saved = await apiPutSharedState(get().world.s)
        remoteVersion = saved.version
      }
    } catch {
      // A previously loaded local world remains usable if the API is temporarily unavailable.
    }
    return { ok: true }
  },

  logout: () => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    } catch {
      // ignore
    }
    void apiLogout().catch(() => undefined)
    set({ session: null })
  },

  reset: (preset) => {
    const w = makeWorld(preset)
    w.d.scopeVehicle = scopeFor(get().session)
    refreshCaches(w)
    set({ world: w })
    writeJSON(localStorage, SERVER_KEY, w.s)
    writeJSON(sessionStorage, DEVICE_KEY, w.d)
    if (w.d.online && get().session) void apiPutSharedState(w.s).then((saved) => { remoteVersion = saved.version }).catch(() => undefined)
  },

  setOnline: (online) => {
    const vid = get().session?.role === 'driver' ? get().session?.vehicleId : undefined
    get().act((w) => {
      setOnline(w, online)
      if (vid) reportDevice(w, vid, online)
    })
  },

  refreshRemote: async () => {
    if (!get().session || !get().world.d.online) return
    try {
      const remote = await apiGetSharedState()
      if (!remote?.state || remote.version <= remoteVersion) return
      remoteVersion = remote.version
      const next: World = { s: remote.state, d: get().world.d }
      next.d.scopeVehicle = scopeFor(get().session)
      refreshCaches(next)
      set({ world: next })
      writeJSON(localStorage, SERVER_KEY, next.s)
      writeJSON(sessionStorage, DEVICE_KEY, next.d)
    } catch {
      // The local copy remains the usable offline copy.
    }
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== SERVER_KEY || !e.newValue) return
    try {
      const s = JSON.parse(e.newValue) as ServerData
      const cur = useStore.getState().world
      const d = s.epoch !== cur.s.epoch ? { ...freshDevice(), scopeVehicle: cur.d.scopeVehicle } : cur.d
      const w: World = structuredClone({ s, d })
      if (w.d.online) refreshCaches(w)
      useStore.setState({ world: w })
      writeJSON(sessionStorage, DEVICE_KEY, w.d)
    } catch {
      // ignore malformed data from another tab
    }
  })
  window.addEventListener('offline', () => useStore.getState().setOnline(false))
  writeJSON(localStorage, SERVER_KEY, useStore.getState().world.s)
}

export const useWorld = () => useStore((s) => s.world)
export const useServer = () => useStore((s) => s.world.s)
export const useDevice = () => useStore((s) => s.world.d)
export const useAct = () => useStore((s) => s.act)
