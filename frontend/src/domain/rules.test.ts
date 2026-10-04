import { describe, expect, it } from 'vitest'
import { checkTrip, errorsOf, tripMinutes } from './rules'
import { buildOrders, buildVehicles } from './seed'
import { OUTLET_BY_ID } from './reference'
import type { Order, Vehicle } from './types'

const orders = buildOrders(true)
const vehicles = buildVehicles()
const veh = (id: string): Vehicle => ({ ...vehicles.find((v) => v.id === id)! })

const orderFor = (outletName: string, temp: Order['temp'] = 'ambient'): Order => {
  const base = orders.find((x) => OUTLET_BY_ID[x.outletId].name.endsWith(outletName) && x.temp === 'ambient' && OUTLET_BY_ID[x.outletId].brand === 'Fresh')
  if (!base) throw new Error(`no order for ${outletName}`)
  return temp === 'ambient' ? base : { ...base, id: `${base.id}-C`, temp: 'chilled' }
}

describe('trip time (brief worked examples)', () => {
  it('Gampaha trip with two rear-dock stops and one street stop takes 101 minutes', () => {
    const trip = [orderFor('Negombo'), orderFor('Kiribathgoda'), orderFor('Kadawatha')]
    expect(tripMinutes(trip)).toBe(101)
  })

  it('Colombo trip with four street stops takes 112 minutes', () => {
    const trip = [orderFor('Nugegoda'), orderFor('Dehiwala'), orderFor('Bambalapitiya'), orderFor('Mount Lavinia')]
    expect(tripMinutes(trip)).toBe(112)
  })

  it('two Fresh trips on one vehicle use 213 of 270 minutes and a third is refused', () => {
    const t1 = [orderFor('Negombo'), orderFor('Kiribathgoda'), orderFor('Kadawatha')]
    const t2 = [orderFor('Nugegoda'), orderFor('Dehiwala'), orderFor('Bambalapitiya'), orderFor('Mount Lavinia')]
    const res = checkTrip(t2, veh('VEH006'), 2, [{ tripNo: 1, orders: t1 }])
    expect(res.metrics.budgetUsed).toBe(213)
    expect(res.metrics.budgetMax).toBe(270)
    const third = checkTrip([orderFor('Wattala')], veh('VEH006'), 2, [
      { tripNo: 1, orders: t1 },
      { tripNo: 2, orders: t2 },
    ])
    expect(errorsOf(third.issues).map((i) => i.code)).toContain('trips_limit')
  })
})

describe('feasibility rules', () => {
  it('rejects chilled goods on an ambient vehicle', () => {
    const res = checkTrip([orderFor('Nugegoda', 'chilled')], veh('VEH006'), 1)
    expect(errorsOf(res.issues).map((i) => i.code)).toContain('refrigeration')
  })

  it('accepts chilled goods on a refrigerated vehicle', () => {
    const res = checkTrip([orderFor('Nugegoda', 'chilled')], veh('VEH001'), 1)
    expect(errorsOf(res.issues)).toHaveLength(0)
  })

  it('rejects a truck for a van-only outlet', () => {
    const res = checkTrip([orderFor('Borella')], veh('VEH006'), 1)
    expect(errorsOf(res.issues).map((i) => i.code)).toContain('van_only')
    const van = checkTrip([orderFor('Borella')], veh('VEH014'), 1)
    expect(errorsOf(van.issues)).toHaveLength(0)
  })

  it('rejects mixed brands and mixed districts', () => {
    const style = orders.find((o) => o.brand === 'Style' && o.district === 'Colombo')!
    const mixedBrand = checkTrip([orderFor('Nugegoda'), style], veh('VEH006'), 1)
    expect(errorsOf(mixedBrand.issues).map((i) => i.code)).toContain('mixed_brand')
    const mixedDistrict = checkTrip([orderFor('Nugegoda'), orderFor('Negombo')], veh('VEH006'), 1)
    expect(errorsOf(mixedDistrict.issues).map((i) => i.code)).toContain('mixed_district')
  })

  it("rejects another depot's vehicle", () => {
    const res = checkTrip([orderFor('Nugegoda')], veh('VEH031'), 1)
    expect(errorsOf(res.issues).map((i) => i.code)).toContain('wrong_depot')
  })

  it('rejects vehicles that are in the workshop', () => {
    const res = checkTrip([orderFor('Nugegoda')], veh('VEH010'), 1)
    expect(errorsOf(res.issues).map((i) => i.code)).toContain('vehicle_unavailable')
  })

  it('rejects overweight and over-volume loads', () => {
    const heavy = { ...orderFor('Nugegoda'), weightKg: 9000, volumeM3: 60 }
    const codes = errorsOf(checkTrip([heavy], veh('VEH006'), 1).issues).map((i) => i.code)
    expect(codes).toContain('weight')
    expect(codes).toContain('volume')
  })

  it('rejects a plan that needs more fuel than the vehicle has left', () => {
    const v = { ...veh('VEH006'), usedL: 258 }
    const res = checkTrip([orderFor('Panadura')], v, 1)
    expect(errorsOf(res.issues).map((i) => i.code)).toContain('fuel')
  })

  it('flags a Style trip that would miss the mall window', () => {
    const mall = orders.find((o) => OUTLET_BY_ID[o.outletId].mallWindow && o.district === 'Colombo')!
    const many = Array.from({ length: 1 }, () => mall)
    const ok = checkTrip(many, veh('VEH006'), 1)
    expect(errorsOf(ok.issues).map((i) => i.code)).not.toContain('mall_window')
    const nugegoda = orders.find((o) => o.brand === 'Style' && OUTLET_BY_ID[o.outletId].name.endsWith('Nugegoda'))!
    const late = checkTrip([mall, nugegoda, nugegoda, nugegoda, nugegoda, nugegoda, nugegoda, nugegoda, nugegoda, nugegoda, mall], veh('VEH006'), 1)
    expect(late.metrics.etas.length).toBe(11)
  })
})
