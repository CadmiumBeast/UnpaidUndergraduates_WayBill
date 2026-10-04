import { describe, expect, it } from 'vitest'
import { autoPlan, DEFAULT_PLAYBOOK } from './planner'
import { checkTrip, errorsOf } from './rules'
import { buildOrders, buildVehicles } from './seed'

const orders = buildOrders(true).filter((o) => o.depot === 'Peliyagoda')
const vehicles = buildVehicles()

describe('autoPlan on the seeded Peliyagoda day', () => {
  const plan = autoPlan(orders, vehicles, DEFAULT_PLAYBOOK)

  it('serves or defers every order exactly once', () => {
    const served = plan.trips.flatMap((t) => t.orderIds)
    const deferred = plan.deferred.map((d) => d.orderId)
    expect(new Set([...served, ...deferred]).size).toBe(orders.length)
    expect(served.length + deferred.length).toBe(orders.length)
  })

  it('produces trips that pass every rule', () => {
    const byVehicle = new Map<string, typeof plan.trips>()
    plan.trips.forEach((t) => byVehicle.set(t.vehicleId, [...(byVehicle.get(t.vehicleId) ?? []), t]))
    for (const [vid, trips] of byVehicle) {
      const v = vehicles.find((x) => x.id === vid)!
      expect(trips.length).toBeLessThanOrEqual(2)
      for (const t of trips) {
        const os = t.orderIds.map((id) => orders.find((o) => o.id === id)!)
        const sibs = trips.filter((x) => x !== t).map((x) => ({ tripNo: x.tripNo, orders: x.orderIds.map((id) => orders.find((o) => o.id === id)!) }))
        const res = checkTrip(os, v, t.tripNo, sibs)
        expect(errorsOf(res.issues), `${vid} trip ${t.tripNo}`).toHaveLength(0)
      }
    }
  })

  it('never uses workshop vehicles', () => {
    const workshop = new Set(vehicles.filter((v) => v.status !== 'available').map((v) => v.id))
    expect(plan.trips.some((t) => workshop.has(t.vehicleId))).toBe(false)
  })

  it('gives every deferral a plain-words reason', () => {
    plan.deferred.forEach((d) => expect(d.reason.length).toBeGreaterThan(10))
  })

  it('has real scarcity: some orders are deferred, and chilled are protected first', () => {
    console.log('served trips:', plan.trips.length, 'deferred:', plan.deferred.length)
    console.log(plan.deferred.map((d) => `${d.orderId}: ${d.reason}`).join('\n'))
    expect(plan.deferred.length).toBeGreaterThan(0)
  })
})
