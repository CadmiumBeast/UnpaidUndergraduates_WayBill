import { describe, expect, it } from 'vitest'
import {
  assignOrder,
  breakVehicle,
  deferOrder,
  driverOutcome,
  getOrder,
  getTrip,
  ordersOfTrip,
  planIssues,
  previewAssign,
  publishPlan,
  resolveConflict,
  setOnline,
  syncNow,
  exhaustFuel,
} from './engine'
import { makeWorld } from './presets'
import { errorsOf } from './rules'
import type { World } from './types'

const driverTrip = (w: World) => w.s.trips.filter((t) => t.vehicleId === 'VEH001').sort((a, b) => a.tripNo - b.tripNo)[0]

describe('presets', () => {
  it('start in consistent states', () => {
    for (const p of ['ordering', 'planning', 'loading', 'onroad'] as const) {
      const w = makeWorld(p)
      expect(w.s.orders.length).toBeGreaterThan(30)
      if (p === 'loading' || p === 'onroad') {
        expect(w.s.phase).toBe('published')
        expect(planIssues(w).filter((x) => errorsOf(x.issues).length)).toHaveLength(0)
      }
    }
  })

  it("driver Ruwan's vehicle always has a trip on the road", () => {
    const w = makeWorld('onroad')
    const t = driverTrip(w)
    expect(t).toBeTruthy()
    expect(t.status).toBe('departed')
    expect(ordersOfTrip(w, t).length).toBeGreaterThan(2)
  })
})

describe('publishing', () => {
  it('is blocked while orders are unresolved', () => {
    const w = makeWorld('planning')
    const res = publishPlan(w, 'Peliyagoda')
    expect(res.ok).toBe(false)
  })
})

describe('assignment explains itself', () => {
  it('refuses a chilled order on an ambient vehicle with a plain-words reason', () => {
    const w = makeWorld('planning')
    const chilled = w.s.orders.find((o) => o.depot === 'Peliyagoda' && o.temp === 'chilled')!
    const p = previewAssign(w, chilled.id, 'VEH006', 1)
    expect(p.ok).toBe(false)
    expect(p.issues.some((i) => i.code === 'refrigeration' && i.message.includes('VEH006'))).toBe(true)
    expect(assignOrder(w, chilled.id, 'VEH006', 1).ok).toBe(false)
    expect(getOrder(w, chilled.id)!.tripId).toBeUndefined()
  })
})

describe('offline sync and conflicts', () => {
  it('applies offline deliveries once the connection returns', () => {
    const w = makeWorld('onroad')
    const t = driverTrip(w)
    const os = ordersOfTrip(w, t)
    const next = os.find((o) => !o.outcome)!
    setOnline(w, false)
    driverOutcome(w, t.id, next.id, { kind: 'delivered', proof: 'code' })
    expect(w.d.outbox).toHaveLength(1)
    expect(getOrder(w, next.id)!.outcome).toBeUndefined()
    expect(w.d.cache[t.id].orders.find((o) => o.id === next.id)!.outcome?.recordedOffline).toBe(true)
    setOnline(w, true)
    expect(w.d.outbox).toHaveLength(0)
    expect(getOrder(w, next.id)!.status).toBe('delivered')
    expect(getOrder(w, next.id)!.outcome?.recordedOffline).toBe(true)
  })

  it('raises a conflict when the dispatcher defers a stop the driver delivered offline', () => {
    const w = makeWorld('onroad')
    const t = driverTrip(w)
    const next = ordersOfTrip(w, t).find((o) => !o.outcome)!
    setOnline(w, false)
    deferOrder(w, next.id, 'Outlet asked to reschedule')
    driverOutcome(w, t.id, next.id, { kind: 'delivered', proof: 'code' })
    setOnline(w, true)
    expect(w.d.conflicts).toHaveLength(1)
    expect(w.d.conflicts[0].kind).toBe('deferred')
    expect(getOrder(w, next.id)!.status).toBe('deferred')
    resolveConflict(w, w.d.conflicts[0].id, 'kept')
    expect(getOrder(w, next.id)!.status).toBe('delivered')
    expect(getTrip(w, t.id)!.orderIds).toContain(next.id)
  })

  it('lets the driver accept the dispatcher change instead', () => {
    const w = makeWorld('onroad')
    const t = driverTrip(w)
    const next = ordersOfTrip(w, t).find((o) => !o.outcome)!
    setOnline(w, false)
    deferOrder(w, next.id, 'Outlet asked to reschedule')
    driverOutcome(w, t.id, next.id, { kind: 'delivered', proof: 'code' })
    setOnline(w, true)
    resolveConflict(w, w.d.conflicts[0].id, 'accepted')
    expect(getOrder(w, next.id)!.status).toBe('deferred')
    syncNow(w)
    expect(w.d.conflicts[0].resolved).toBe('accepted')
  })
})

describe('failure scenarios', () => {
  it('a broken-down vehicle frees its undelivered stops for reassignment', () => {
    const w = makeWorld('onroad')
    const t = driverTrip(w)
    const undelivered = ordersOfTrip(w, t).filter((o) => !o.outcome).map((o) => o.id)
    breakVehicle(w, 'VEH001')
    expect(getTrip(w, t.id)!.status).toBe('stranded')
    undelivered.forEach((id) => {
      const o = getOrder(w, id)!
      expect(o.stranded).toBe(true)
      expect(o.tripId).toBeUndefined()
    })
  })

  it('exhausting the fuel quota makes planned trips invalid', () => {
    const w = makeWorld('loading')
    const trip = w.s.trips.find((t) => t.vehicleId === 'VEH001')!
    expect(trip).toBeTruthy()
    exhaustFuel(w, 'VEH001')
    const issues = planIssues(w).filter((p) => p.vehicleId === 'VEH001')
    expect(issues.some((p) => p.issues.some((i) => i.code === 'fuel'))).toBe(true)
  })
})

describe('driver phone only holds its own trips', () => {
  it('caches just the scoped vehicle', async () => {
    const { refreshCaches } = await import('./engine')
    const w = makeWorld('onroad')
    w.d.scopeVehicle = 'VEH001'
    refreshCaches(w)
    const vehicles = new Set(Object.values(w.d.cache).map((c) => c.trip.vehicleId))
    expect([...vehicles]).toEqual(['VEH001'])
  })
})
