import { MAX_TRIPS, OUTLET_BY_ID } from './reference'
import { checkTrip, errorsOf, sortStops, type IssueCode } from './rules'
import type { Order, Playbook, Vehicle } from './types'

export const DEFAULT_PLAYBOOK: Playbook = { chilled: 40, skipped: 35, days: 15, fresh: 10 }

export function priorityScore(o: Order, pb: Playbook): number {
  return (
    pb.chilled * (o.temp === 'chilled' ? 1 : 0) +
    pb.skipped * (o.deferredYesterday ? 1 : 0) +
    (pb.days * Math.min(o.daysSinceLastServed, 7)) / 7 +
    pb.fresh * (o.brand === 'Fresh' ? 1 : 0)
  )
}

export interface PlanTrip {
  vehicleId: string
  tripNo: 1 | 2
  orderIds: string[]
}

export interface PlanResult {
  trips: PlanTrip[]
  deferred: { orderId: string; reason: string }[]
}

interface Slot {
  tripNo: 1 | 2
  orders: Order[]
}

function vehicleOk(v: Vehicle, slots: Slot[]): IssueCode | null {
  for (const s of slots) {
    const sibs = slots.filter((x) => x !== s)
    const res = checkTrip(s.orders, v, s.tripNo, sibs)
    const errs = errorsOf(res.issues)
    if (errs.length) return errs[0].code
  }
  return null
}

function withJoin(slots: Slot[], target: Slot, o: Order): Slot[] {
  return slots.map((s) => (s === target ? { tripNo: s.tripNo, orders: sortStops([...s.orders, o]) } : s))
}

export function autoPlan(orders: Order[], vehicles: Vehicle[], pb: Playbook): PlanResult {
  const pool = vehicles.filter((v) => v.status === 'available')
  const plan = new Map<string, Slot[]>()
  const deferred: PlanResult['deferred'] = []

  const sorted = [...orders].sort(
    (a, b) => priorityScore(b, pb) - priorityScore(a, pb) || a.outletId.localeCompare(b.outletId) || a.id.localeCompare(b.id),
  )

  for (const o of sorted) {
    const candidates: { v: Vehicle; rank: number; slots: Slot[] }[] = []
    const blockers: IssueCode[] = []

    for (const v of pool.filter((x) => x.depot === o.depot)) {
      const slots = plan.get(v.id) ?? []
      for (const s of slots) {
        if (s.orders[0].brand === o.brand && s.orders[0].district === o.district) {
          const next = withJoin(slots, s, o)
          const bad = vehicleOk(v, next)
          if (!bad) candidates.push({ v, rank: 0, slots: next })
          else blockers.push(bad)
        }
      }
      if (slots.length < MAX_TRIPS) {
        const next: Slot[] = [...slots, { tripNo: (slots.length + 1) as 1 | 2, orders: [o] }]
        const bad = vehicleOk(v, next)
        if (!bad) candidates.push({ v, rank: 1, slots: next })
        else blockers.push(bad)
      } else if (!slots.some((s) => s.orders[0].brand === o.brand && s.orders[0].district === o.district)) {
        blockers.push('trips_limit')
      }
    }

    if (candidates.length === 0) {
      deferred.push({ orderId: o.id, reason: diagnose(o, pool, blockers) })
      continue
    }

    candidates.sort((a, b) => {
      const wa = o.temp === 'ambient' && a.v.temp === 'reefer' ? 1 : 0
      const wb = o.temp === 'ambient' && b.v.temp === 'reefer' ? 1 : 0
      const vanOnly = OUTLET_BY_ID[o.outletId].parking === 'van_only'
      const pa = !vanOnly && a.v.type === 'van' ? 1 : 0
      const pb2 = !vanOnly && b.v.type === 'van' ? 1 : 0
      return a.rank - b.rank || wa - wb || pa - pb2 || b.v.weightCap - a.v.weightCap || a.v.id.localeCompare(b.v.id)
    })
    plan.set(candidates[0].v.id, candidates[0].slots)
  }

  const trips: PlanTrip[] = []
  for (const [vehicleId, slots] of plan) {
    for (const s of slots) trips.push({ vehicleId, tripNo: s.tripNo, orderIds: s.orders.map((x) => x.id) })
  }
  trips.sort((a, b) => a.vehicleId.localeCompare(b.vehicleId) || a.tripNo - b.tripNo)
  return { trips, deferred }
}

function diagnose(o: Order, pool: Vehicle[], blockers: IssueCode[]): string {
  const outlet = OUTLET_BY_ID[o.outletId]
  const local = pool.filter((v) => v.depot === o.depot)
  if (o.temp === 'chilled') {
    const reefers = local.filter((v) => v.temp === 'reefer')
    if (reefers.length === 0) return `No refrigerated vehicle is available at ${o.depot} today.`
  }
  if (outlet.parking === 'van_only') {
    const vans = local.filter((v) => v.type === 'van' && (o.temp === 'ambient' || v.temp === 'reefer'))
    if (vans.length === 0) return 'This outlet is van-only, and no suitable van is available today.'
  }
  const counts = new Map<IssueCode, number>()
  blockers.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1))
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const kind = o.temp === 'chilled' ? 'refrigerated' : 'suitable'
  switch (top) {
    case 'time_budget':
      return `Every ${kind} vehicle has used its ${o.brand === 'Fresh' ? '270-minute Fresh' : '480-minute'} time budget.`
    case 'weight':
    case 'volume':
      return `Every ${kind} vehicle is full for this district.`
    case 'fuel':
      return "The remaining fuel quota on suitable vehicles can't cover the extra distance."
    case 'trips_limit':
      return `Every ${kind} vehicle already has its 2 trips.`
    case 'mall_window':
      return "It can't reach the mall inside its delivery window."
    default:
      return `No ${kind} capacity left today.`
  }
}
