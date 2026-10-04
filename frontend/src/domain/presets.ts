import { DEPOTS } from './reference'
import {
  closeOrders,
  confirmReady,
  driverOutcome,
  driverStartTrip,
  markLoaded,
  ordersOfTrip,
  publishPlan,
  refreshCaches,
  runAutoPlan,
  startLoading,
} from './engine'
import { baseServer } from './seed'
import type { DeviceData, World } from './types'

export type PresetId = 'ordering' | 'planning' | 'loading' | 'onroad'

export const PRESETS: { id: PresetId; label: string; hint: string }[] = [
  { id: 'ordering', label: 'Before the 4 PM cutoff', hint: 'Store managers can still place orders. Start the full walkthrough here.' },
  { id: 'planning', label: 'Orders closed, plan needed', hint: 'The dispatcher has a queue and no plan yet.' },
  { id: 'loading', label: 'Plan published, loading', hint: 'Loaders are loading. Good for loader and shortfall tests.' },
  { id: 'onroad', label: 'Trucks on the road', hint: 'Drivers are mid-route. Good for offline and conflict tests.' },
]

export const freshDevice = (): DeviceData => ({
  online: true,
  cache: {},
  outbox: [],
  conflicts: [],
  lastSyncedAt: new Date().toISOString(),
})

export function makeWorld(preset: PresetId): World {
  const w: World = { s: baseServer(preset !== 'ordering'), d: freshDevice() }
  w.s.preset = preset
  if (preset === 'ordering') return w
  closeOrders(w)
  if (preset === 'planning') return w
  for (const depot of DEPOTS) {
    runAutoPlan(w, depot)
    publishPlan(w, depot)
  }
  if (preset === 'loading') {
    w.s.trips.filter((t) => t.brand === 'Fresh').slice(0, 2).forEach((t) => startLoading(w, t.id))
    refreshCaches(w)
    return w
  }
  for (const t of w.s.trips) {
    for (const o of ordersOfTrip(w, t)) markLoaded(w, o.id, true)
    confirmReady(w, t.id, `SL-${t.id.slice(-3)}`)
    driverStartTrip(w, t.id, { fuelOk: true, sealOk: true, fridgeC: 3.4 })
  }
  // put every trip partway through so the live monitor has something to show
  w.s.trips.forEach((t, i) => {
    const os = ordersOfTrip(w, t)
    const done = t.vehicleId === 'VEH001' ? Math.min(2, os.length - 1) : Math.min(i % 3, os.length - 1)
    for (let k = 0; k < done; k++) driverOutcome(w, t.id, os[k].id, { kind: 'delivered', proof: 'code' })
  })
  refreshCaches(w)
  return w
}
