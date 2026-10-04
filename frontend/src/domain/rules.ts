import { fmt12, toMin } from '@/lib/utils'
import { ALLOWANCE, BUDGET, DEPART_MIN, DISTRICTS, MAX_TRIPS, OUTLET_BY_ID, RELOAD_MIN, budgetClass } from './reference'
import type { BudgetClass, Order, Vehicle } from './types'

export type IssueCode =
  | 'vehicle_unavailable'
  | 'wrong_depot'
  | 'mixed_brand'
  | 'mixed_district'
  | 'refrigeration'
  | 'van_only'
  | 'weight'
  | 'volume'
  | 'trips_limit'
  | 'time_budget'
  | 'fuel'
  | 'mall_window'
  | 'late_risk'

export interface Issue {
  code: IssueCode
  severity: 'error' | 'warning'
  message: string
  orderId?: string
}

export interface Eta {
  orderId: string
  arriveMin: number
  waitMin: number
  leaveMin: number
}

export interface TripMetrics {
  weightKg: number
  volumeM3: number
  weightCap: number
  volumeCap: number
  minutes: number
  budgetClass: BudgetClass
  budgetUsed: number
  budgetMax: number
  km: number
  fuelL: number
  fuelPlannedL: number
  fuelRemainingL: number
  departMin: number
  etas: Eta[]
  latestDepartMin?: number
}

export interface Sibling {
  tripNo: 1 | 2
  orders: Order[]
}

const outletOf = (o: Order) => OUTLET_BY_ID[o.outletId]

export function tripMinutes(orders: Order[]): number {
  if (orders.length === 0) return 0
  const d = DISTRICTS[orders[0].district]
  const handling = orders.reduce((sum, o) => sum + ALLOWANCE[o.brand][outletOf(o).dock], 0)
  return d.outboundMin + d.interMin * (orders.length - 1) + handling
}

export function tripKm(orders: Order[]): number {
  if (orders.length === 0) return 0
  const d = DISTRICTS[orders[0].district]
  return d.outboundKm * 2 + d.interKm * (orders.length - 1)
}

export function tripFuelL(orders: Order[], vehicle: Vehicle): number {
  return tripKm(orders) / vehicle.kmPerL
}

export function departureFor(orders: Order[], tripNo: 1 | 2, siblings: Sibling[]): number {
  if (orders.length === 0) return 0
  const cls = budgetClass(orders[0].brand)
  const base = DEPART_MIN[cls]
  if (tripNo === 1) return base
  const first = siblings.find((s) => s.tripNo === 1 && s.orders.length > 0 && budgetClass(s.orders[0].brand) === cls)
  if (!first) return base
  const d = DISTRICTS[first.orders[0].district]
  return DEPART_MIN[cls] + tripMinutes(first.orders) + d.outboundMin + RELOAD_MIN
}

export function computeEtas(orders: Order[], departMin: number): Eta[] {
  if (orders.length === 0) return []
  const d = DISTRICTS[orders[0].district]
  let t = departMin + d.outboundMin
  return orders.map((o, i) => {
    const out = outletOf(o)
    const open = out.mallWindow ? toMin(out.mallWindow[0]) : toMin(out.windowOpen)
    const arrive = t
    const start = Math.max(arrive, open)
    const leave = start + ALLOWANCE[o.brand][out.dock]
    t = leave + (i < orders.length - 1 ? d.interMin : 0)
    return { orderId: o.id, arriveMin: start, waitMin: start - arrive, leaveMin: leave }
  })
}

// Latest time the truck can leave the depot and still make every window (ignoring early waits).
export function latestDeparture(orders: Order[]): number | undefined {
  if (orders.length === 0) return undefined
  const d = DISTRICTS[orders[0].district]
  let offset = d.outboundMin
  let best: number | undefined
  orders.forEach((o, i) => {
    const out = outletOf(o)
    const close = out.mallWindow ? toMin(out.mallWindow[1]) : out.brand === 'Fresh' ? toMin(out.windowClose) : undefined
    if (close !== undefined) {
      const v = close - offset
      best = best === undefined ? v : Math.min(best, v)
    }
    offset += ALLOWANCE[o.brand][out.dock] + (i < orders.length - 1 ? d.interMin : 0)
  })
  return best
}

const names = (orders: Order[]) => orders.map((o) => outletOf(o).name.replace('Waypoint ', '')).join(', ')

export function checkTrip(
  orders: Order[],
  vehicle: Vehicle,
  tripNo: 1 | 2,
  siblings: Sibling[] = [],
): { issues: Issue[]; metrics: TripMetrics } {
  const issues: Issue[] = []
  const err = (code: IssueCode, message: string, orderId?: string) =>
    issues.push({ code, severity: 'error', message, orderId })
  const warn = (code: IssueCode, message: string, orderId?: string) =>
    issues.push({ code, severity: 'warning', message, orderId })

  const brand = orders[0]?.brand ?? 'Fresh'
  const cls = budgetClass(brand)

  if (vehicle.status !== 'available') {
    err(
      'vehicle_unavailable',
      `${vehicle.id} is ${vehicle.status === 'in_workshop' ? 'in the workshop' : 'broken down'} and can't be used today.`,
    )
  }
  if (orders.some((o) => o.depot !== vehicle.depot)) {
    err('wrong_depot', `${vehicle.id} belongs to ${vehicle.depot} depot and can only serve its own outlets.`)
  }
  if (new Set(orders.map((o) => o.brand)).size > 1) {
    err('mixed_brand', 'A trip can only carry one brand. Split the brands into separate trips.')
  }
  if (new Set(orders.map((o) => o.district)).size > 1) {
    err('mixed_district', 'A trip can only serve one district. Split the districts into separate trips.')
  }

  const chilled = orders.filter((o) => o.temp === 'chilled')
  if (chilled.length > 0 && vehicle.temp !== 'reefer') {
    err(
      'refrigeration',
      `${names(chilled)} need chilled transport, and ${vehicle.id} is an ambient vehicle. Only refrigerated vehicles can carry chilled goods.`,
      chilled[0].id,
    )
  }
  const vanOnly = orders.filter((o) => outletOf(o).parking === 'van_only')
  if (vanOnly.length > 0 && vehicle.type !== 'van') {
    err('van_only', `${names(vanOnly)} can only be reached by a van, and ${vehicle.id} is a truck.`, vanOnly[0].id)
  }

  const weightKg = orders.reduce((s, o) => s + o.weightKg, 0)
  const volumeM3 = orders.reduce((s, o) => s + o.volumeM3, 0)
  if (weightKg > vehicle.weightCap) {
    err('weight', `Load weighs ${Math.round(weightKg)} kg, over the ${vehicle.weightCap} kg limit on ${vehicle.id}.`)
  }
  if (volumeM3 > vehicle.volumeCap + 1e-9) {
    err('volume', `Load takes ${volumeM3.toFixed(1)} m³, over the ${vehicle.volumeCap} m³ limit on ${vehicle.id}.`)
  }

  if (tripNo > MAX_TRIPS || siblings.length + 1 > MAX_TRIPS) {
    err('trips_limit', `${vehicle.id} can run at most ${MAX_TRIPS} trips a day.`)
  }

  const minutes = tripMinutes(orders)
  const sameClass = siblings.filter((s) => s.orders.length > 0 && budgetClass(s.orders[0].brand) === cls)
  const budgetUsed = minutes + sameClass.reduce((s, x) => s + tripMinutes(x.orders), 0)
  const budgetMax = BUDGET[cls]
  if (orders.length > 0 && budgetUsed > budgetMax) {
    err(
      'time_budget',
      `${cls === 'fresh' ? 'Fresh' : 'Style and Tech'} trips on ${vehicle.id} would take ${budgetUsed} of ${budgetMax} minutes.`,
    )
  }

  const km = tripKm(orders)
  const fuelL = tripFuelL(orders, vehicle)
  const fuelPlannedL = fuelL + siblings.reduce((s, x) => s + tripFuelL(x.orders, vehicle), 0)
  const fuelRemainingL = Math.max(0, vehicle.weeklyQuotaL - vehicle.usedL)
  if (orders.length > 0 && fuelPlannedL > fuelRemainingL + 1e-9) {
    err(
      'fuel',
      `${vehicle.id} has ${fuelRemainingL.toFixed(0)} L of weekly fuel left, and today's trips need ${fuelPlannedL.toFixed(0)} L.`,
    )
  }

  const departMin = departureFor(orders, tripNo, siblings)
  const etas = computeEtas(orders, departMin)
  etas.forEach((e, i) => {
    const o = orders[i]
    const out = outletOf(o)
    if (out.mallWindow) {
      if (e.arriveMin > toMin(out.mallWindow[1])) {
        err(
          'mall_window',
          `${out.name.replace('Waypoint ', '')} would be reached at ${fmt12(e.arriveMin)}, after the mall's delivery window closes at ${fmt12(toMin(out.mallWindow[1]))}.`,
          o.id,
        )
      }
    } else if (o.brand === 'Fresh' && e.arriveMin > toMin(out.windowClose)) {
      warn(
        'late_risk',
        `${out.name.replace('Waypoint ', '')} would be reached at ${fmt12(e.arriveMin)}, after its window closes at ${fmt12(toMin(out.windowClose))}.`,
        o.id,
      )
    }
  })

  return {
    issues,
    metrics: {
      weightKg,
      volumeM3,
      weightCap: vehicle.weightCap,
      volumeCap: vehicle.volumeCap,
      minutes,
      budgetClass: cls,
      budgetUsed,
      budgetMax,
      km,
      fuelL,
      fuelPlannedL,
      fuelRemainingL,
      departMin,
      etas,
      latestDepartMin: latestDeparture(orders),
    },
  }
}

export const errorsOf = (issues: Issue[]) => issues.filter((i) => i.severity === 'error')
export const warningsOf = (issues: Issue[]) => issues.filter((i) => i.severity === 'warning')

export function sortStops(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const oa = outletOf(a)
    const ob = outletOf(b)
    const ca = oa.mallWindow ? toMin(oa.mallWindow[1]) : toMin(oa.windowClose)
    const cb = ob.mallWindow ? toMin(ob.mallWindow[1]) : toMin(ob.windowClose)
    return ca - cb || oa.id.localeCompare(ob.id)
  })
}
