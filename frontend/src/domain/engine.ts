import { fmt12 } from '@/lib/utils'
import { autoPlan } from './planner'
import { OUTLET_BY_ID } from './reference'
import { checkTrip, errorsOf, sortStops, tripFuelL, type Issue, type TripMetrics } from './rules'
import { estimateSize } from './seed'
import type {
  Conflict,
  Depot,
  Order,
  Outcome,
  OutboxItem,
  Role,
  Temp,
  Trip,
  Vehicle,
  VehicleStatus,
  World,
} from './types'

// Every function here mutates the world it is given. The store clones the world first, so the
// UI never sees a half-applied change, and tests can call them directly on a fresh world.

const now = () => new Date().toISOString()
const clone = <T,>(x: T): T => structuredClone(x)

export const getOrder = (w: World, id: string) => w.s.orders.find((o) => o.id === id)
export const getTrip = (w: World, id: string) => w.s.trips.find((t) => t.id === id)
export const getVehicle = (w: World, id: string) => w.s.vehicles.find((v) => v.id === id)
export const outletName = (o: Order) => OUTLET_BY_ID[o.outletId].name.replace('Waypoint ', '')

export function log(w: World, actor: string, text: string) {
  w.s.counters.event += 1
  w.s.events.unshift({ id: `E${w.s.counters.event}`, ts: now(), actor, text })
  if (w.s.events.length > 400) w.s.events.length = 400
}

export function notify(
  w: World,
  to: Role,
  key: string | undefined,
  title: string,
  body: string,
  kind: 'info' | 'warning' | 'success' | 'danger' = 'info',
) {
  w.s.counters.notice += 1
  w.s.notices.unshift({ id: `N${w.s.counters.notice}`, ts: now(), to, key, title, body, kind, read: false })
  if (w.s.notices.length > 300) w.s.notices.length = 300
}

export function refreshCaches(w: World) {
  if (!w.d.online) return
  const cache: World['d']['cache'] = {}
  for (const t of w.s.trips) {
    if (t.status === 'draft') continue
    if (w.d.scopeVehicle && t.vehicleId !== w.d.scopeVehicle) continue
    cache[t.id] = { trip: clone(t), orders: t.orderIds.map((id) => clone(getOrder(w, id)!)).filter(Boolean) }
  }
  w.d.cache = cache
  w.d.lastSyncedAt = now()
}

export const ordersOfTrip = (w: World, trip: Trip): Order[] =>
  trip.orderIds.map((id) => getOrder(w, id)).filter((o): o is Order => !!o)

export const tripsOfVehicle = (w: World, vehicleId: string) =>
  w.s.trips.filter((t) => t.vehicleId === vehicleId).sort((a, b) => a.tripNo - b.tripNo)

const activeTrips = (w: World, vehicleId: string) =>
  tripsOfVehicle(w, vehicleId).filter((t) => t.status !== 'stranded')

// ---------- ordering ----------

export function placeOrder(w: World, outletId: string, temp: Temp, units: number): Order {
  const outlet = OUTLET_BY_ID[outletId]
  const size = estimateSize(outlet.brand, temp, units)
  w.s.counters.order += 1
  const closed = w.s.phase !== 'ordering'
  const order: Order = {
    id: `ORD-${w.s.counters.order}`,
    ref: `ORD-${w.s.counters.order}`,
    outletId,
    brand: outlet.brand,
    district: outlet.district,
    depot: outlet.depot,
    temp,
    units,
    weightKg: size.weightKg,
    volumeM3: size.volumeM3,
    status: closed ? 'next_run' : 'confirmed',
    placedAt: now(),
    deferredYesterday: false,
    daysSinceLastServed: 1,
  }
  w.s.orders.push(order)
  notify(
    w,
    'manager',
    outletId,
    closed ? 'Order received for the next run' : 'Order confirmed',
    closed
      ? `${order.ref} arrived after the 4:00 PM cutoff, so it will go out on the following run.`
      : `${order.ref} is confirmed for tomorrow's run. We'll tell you the arrival window once the plan is published.`,
    closed ? 'warning' : 'success',
  )
  log(w, outlet.name, `Placed ${order.ref} (${units} units, ${temp})`)
  return order
}

export function amendOrder(w: World, orderId: string, units: number): boolean {
  const o = getOrder(w, orderId)
  if (!o || w.s.phase !== 'ordering' || o.status !== 'confirmed' || units < 1) return false
  const size = estimateSize(o.brand, o.temp, units)
  o.units = units
  o.weightKg = size.weightKg
  o.volumeM3 = size.volumeM3
  log(w, OUTLET_BY_ID[o.outletId].name, `Changed ${o.ref} to ${units} units before the cutoff`)
  return true
}

export function cancelOrder(w: World, orderId: string): boolean {
  const o = getOrder(w, orderId)
  if (!o || w.s.phase !== 'ordering' || o.status !== 'confirmed') return false
  w.s.orders = w.s.orders.filter((x) => x.id !== orderId)
  log(w, OUTLET_BY_ID[o.outletId].name, `Cancelled ${o.ref} before the cutoff`)
  return true
}

export function closeOrders(w: World) {
  w.s.phase = 'planning'
  log(w, 'Dispatcher', 'Closed orders at the 4:00 PM cutoff')
}

// ---------- planning ----------

export function runAutoPlan(w: World, depot: Depot) {
  const mine = w.s.trips.filter((t) => t.depot === depot && t.status === 'draft')
  for (const t of mine) {
    for (const id of t.orderIds) {
      const o = getOrder(w, id)
      if (o) {
        o.status = 'confirmed'
        o.tripId = undefined
      }
    }
  }
  w.s.trips = w.s.trips.filter((t) => !(t.depot === depot && t.status === 'draft'))
  for (const o of w.s.orders) {
    if (o.depot === depot && o.status === 'deferred' && !o.stranded) {
      o.status = 'confirmed'
      o.deferReason = undefined
    }
  }
  const candidates = w.s.orders.filter((o) => o.depot === depot && o.status === 'confirmed')
  const res = autoPlan(candidates, w.s.vehicles, w.s.playbook)
  for (const pt of res.trips) {
    w.s.counters.trip += 1
    const first = getOrder(w, pt.orderIds[0])!
    const trip: Trip = {
      id: `TRP-${200 + w.s.counters.trip}`,
      vehicleId: pt.vehicleId,
      tripNo: pt.tripNo,
      brand: first.brand,
      district: first.district,
      depot,
      orderIds: pt.orderIds,
      status: 'draft',
      version: 0,
      changes: [],
    }
    w.s.trips.push(trip)
    for (const id of pt.orderIds) {
      const o = getOrder(w, id)!
      o.status = 'planned'
      o.tripId = trip.id
    }
  }
  for (const d of res.deferred) {
    const o = getOrder(w, d.orderId)!
    o.status = 'deferred'
    o.deferReason = d.reason
    o.deferredAt = now()
  }
  log(w, 'Dispatcher', `Suggested a plan for ${depot}: ${res.trips.length} trips, ${res.deferred.length} deferred`)
  return res
}

export interface AssignPreview {
  ok: boolean
  issues: Issue[]
  metrics: TripMetrics
  existingTripId?: string
}

function tripOrdersWithout(w: World, trip: Trip | undefined, orderId: string): Order[] {
  if (!trip) return []
  return ordersOfTrip(w, trip).filter((o) => o.id !== orderId)
}

export function previewAssign(w: World, orderId: string, vehicleId: string, tripNo: 1 | 2): AssignPreview {
  const order = getOrder(w, orderId)!
  const vehicle = getVehicle(w, vehicleId)!
  const trips = activeTrips(w, vehicleId)
  const target = trips.find((t) => t.tripNo === tripNo)
  const issues: Issue[] = []
  const locked = target && ['ready', 'departed', 'done'].includes(target.status)
  if (locked) {
    const dummy = checkTrip([order], vehicle, tripNo, [])
    issues.push({ code: 'trips_limit', severity: 'error', message: `Trip ${tripNo} on ${vehicleId} has already been sealed or left the depot.` })
    return { ok: false, issues, metrics: dummy.metrics, existingTripId: target?.id }
  }
  const targetOrders = sortStops([...tripOrdersWithout(w, target, orderId), order])
  const siblingTrips = trips.filter((t) => t.tripNo !== tripNo)
  const siblings = siblingTrips.map((t) => ({ tripNo: t.tripNo, orders: tripOrdersWithout(w, t, orderId) }))
  const res = checkTrip(targetOrders, vehicle, tripNo, siblings)
  issues.push(...res.issues)
  for (const s of siblingTrips) {
    const others = [
      { tripNo, orders: targetOrders },
      ...siblingTrips.filter((x) => x !== s).map((x) => ({ tripNo: x.tripNo, orders: tripOrdersWithout(w, x, orderId) })),
    ]
    const r2 = checkTrip(tripOrdersWithout(w, s, orderId), vehicle, s.tripNo, others)
    errorsOf(r2.issues).forEach((i) =>
      issues.push({ ...i, message: `Trip ${s.tripNo} on this vehicle would stop fitting: ${i.message}` }),
    )
  }
  return { ok: errorsOf(issues).length === 0, issues, metrics: res.metrics, existingTripId: target?.id }
}

function bump(w: World, trip: Trip, text: string, notifyStores = false) {
  if (trip.status === 'draft') return
  trip.version += 1
  trip.changes.push({ v: trip.version, at: now(), text })
  notify(w, 'loader', trip.depot, 'Plan changed', `${trip.id} (${trip.vehicleId}): ${text}`, 'warning')
  notify(w, 'driver', trip.vehicleId, 'Plan changed', `Trip ${trip.tripNo}: ${text}`, 'warning')
  if (notifyStores) log(w, 'Dispatcher', `${trip.id}: ${text}`)
}

function detach(w: World, o: Order, why: string) {
  if (!o.tripId) return
  const t = getTrip(w, o.tripId)
  if (t) {
    t.orderIds = t.orderIds.filter((id) => id !== o.id)
    if (t.orderIds.length === 0 && t.status === 'draft') {
      w.s.trips = w.s.trips.filter((x) => x.id !== t.id)
    } else {
      bump(w, t, `${outletName(o)} ${why}`)
    }
  }
  o.tripId = undefined
}

export function assignOrder(w: World, orderId: string, vehicleId: string, tripNo: 1 | 2): AssignPreview {
  const preview = previewAssign(w, orderId, vehicleId, tripNo)
  if (!preview.ok) return preview
  const order = getOrder(w, orderId)!
  const vehicle = getVehicle(w, vehicleId)!
  const moving = !!order.tripId
  detach(w, order, `was moved to ${vehicleId}`)
  let trip = activeTrips(w, vehicleId).find((t) => t.tripNo === tripNo)
  let created = false
  if (!trip) {
    created = true
    w.s.counters.trip += 1
    trip = {
      id: `TRP-${200 + w.s.counters.trip}`,
      vehicleId,
      tripNo,
      brand: order.brand,
      district: order.district,
      depot: vehicle.depot,
      orderIds: [],
      status: w.s.phase === 'published' ? 'published' : 'draft',
      version: w.s.phase === 'published' ? 1 : 0,
      changes: w.s.phase === 'published' ? [{ v: 1, at: now(), text: 'Trip created for reassigned stops' }] : [],
    }
    w.s.trips.push(trip)
  }
  trip.orderIds = sortStops([...ordersOfTrip(w, trip), order]).map((o) => o.id)
  order.tripId = trip.id
  order.status = 'planned'
  order.stranded = false
  order.deferReason = undefined
  if (trip.status !== 'draft') {
    order.handoffCode = order.handoffCode ?? String(1000 + Math.floor(Math.random() * 9000))
    order.loadState = 'pending'
    if (!created) bump(w, trip, `${outletName(order)} ${moving ? 'was added from another vehicle' : 'was added'}`)
    else {
      notify(w, 'loader', trip.depot, 'New trip to load', `${trip.id} on ${trip.vehicleId} was created for reassigned stops.`, 'warning')
      notify(w, 'driver', trip.vehicleId, 'New trip assigned', `Trip ${trip.tripNo} to ${trip.district} was added for reassigned stops.`, 'warning')
    }
    notify(w, 'manager', order.outletId, 'Delivery rescheduled onto a new vehicle', `${order.ref} will now arrive with ${vehicleId}. We'll update the arrival window shortly.`, 'info')
  }
  log(w, 'Dispatcher', `Assigned ${order.ref} to ${vehicleId} trip ${tripNo}`)
  return preview
}

export function unassignOrder(w: World, orderId: string) {
  const o = getOrder(w, orderId)!
  detach(w, o, 'was removed')
  o.status = 'confirmed'
  o.deferReason = undefined
}

export function deferOrder(w: World, orderId: string, reason: string) {
  const o = getOrder(w, orderId)!
  const trip = o.tripId ? getTrip(w, o.tripId) : undefined
  const after = !!trip && trip.status !== 'draft'
  detach(w, o, `was deferred (${reason})`)
  o.status = 'deferred'
  o.deferReason = reason
  o.deferredAt = now()
  o.stranded = false
  if (after || w.s.phase === 'published') {
    notify(
      w,
      'manager',
      o.outletId,
      'Delivery deferred',
      `${o.ref} won't arrive on today's run. Reason: ${reason}. It moves to the next run.`,
      'danger',
    )
  }
  log(w, 'Dispatcher', `Deferred ${o.ref} (${reason})`)
}

export function reorderStop(w: World, tripId: string, orderId: string, dir: -1 | 1) {
  const t = getTrip(w, tripId)!
  const i = t.orderIds.indexOf(orderId)
  const j = i + dir
  if (i < 0 || j < 0 || j >= t.orderIds.length) return
  ;[t.orderIds[i], t.orderIds[j]] = [t.orderIds[j], t.orderIds[i]]
  bump(w, t, 'stop order changed')
}

export interface PlanIssue {
  tripId: string
  vehicleId: string
  issues: Issue[]
  metrics: TripMetrics
}

export function planIssues(w: World): PlanIssue[] {
  const out: PlanIssue[] = []
  for (const v of w.s.vehicles) {
    const trips = activeTrips(w, v.id).filter((t) => ['draft', 'published', 'loading', 'ready'].includes(t.status))
    for (const t of trips) {
      const sibs = activeTrips(w, v.id)
        .filter((x) => x.id !== t.id)
        .map((x) => ({ tripNo: x.tripNo, orders: ordersOfTrip(w, x) }))
      const res = checkTrip(ordersOfTrip(w, t), v, t.tripNo, sibs)
      out.push({ tripId: t.id, vehicleId: v.id, issues: res.issues, metrics: res.metrics })
    }
  }
  return out
}

export function etaWindow(w: World, order: Order): { from: number; to: number } | null {
  const trip = order.tripId ? getTrip(w, order.tripId) : undefined
  if (!trip) return null
  const v = getVehicle(w, trip.vehicleId)!
  const sibs = activeTrips(w, v.id)
    .filter((x) => x.id !== trip.id)
    .map((x) => ({ tripNo: x.tripNo, orders: ordersOfTrip(w, x) }))
  const res = checkTrip(ordersOfTrip(w, trip), v, trip.tripNo, sibs)
  const e = res.metrics.etas.find((x) => x.orderId === order.id)
  if (!e) return null
  return { from: e.arriveMin, to: e.arriveMin + 30 }
}

export function publishPlan(w: World, depot: Depot): { ok: boolean; reason?: string; trips: number; served: number; deferred: number } {
  const unresolved = w.s.orders.filter((o) => o.depot === depot && o.status === 'confirmed')
  if (unresolved.length > 0) {
    return { ok: false, reason: `${unresolved.length} orders still need a vehicle or a deferral.`, trips: 0, served: 0, deferred: 0 }
  }
  const blocking = planIssues(w).filter((p) => errorsOf(p.issues).length > 0 && w.s.trips.find((t) => t.id === p.tripId)?.depot === depot)
  if (blocking.length > 0) {
    return { ok: false, reason: `${blocking.length} trips break a rule. Fix them first.`, trips: 0, served: 0, deferred: 0 }
  }
  const trips = w.s.trips.filter((t) => t.depot === depot && t.status === 'draft')
  let served = 0
  for (const t of trips) {
    t.status = 'published'
    t.version = 1
    const os = ordersOfTrip(w, t)
    os.forEach((o) => {
      o.handoffCode = String(1000 + Math.floor(Math.random() * 9000))
      o.loadState = 'pending'
      served += 1
    })
    notify(w, 'driver', t.vehicleId, `Trip ${t.tripNo} is planned`, `${os.length} stops in ${t.district}. Loading starts soon.`, 'info')
  }
  w.s.phase = 'published'
  // notify stores after codes exist
  for (const t of trips) {
    for (const o of ordersOfTrip(w, t)) {
      const win = etaWindow(w, o)
      notify(
        w,
        'manager',
        o.outletId,
        'Delivery planned',
        `${o.ref} is planned${win ? ` for ${fmt12(win.from)} to ${fmt12(win.to)}` : ''}. Your receiving code is ${o.handoffCode}.`,
        'success',
      )
    }
  }
  const deferred = w.s.orders.filter((o) => o.depot === depot && o.status === 'deferred' && !o.stranded)
  for (const o of deferred) {
    notify(
      w,
      'manager',
      o.outletId,
      'Delivery deferred',
      `${o.ref} won't arrive on today's run. Reason: ${o.deferReason}. It moves to the next run.`,
      'danger',
    )
  }
  notify(w, 'loader', depot, 'Plan published', `${trips.length} trips to load. Chilled trips first.`, 'info')
  log(w, 'Dispatcher', `Published the ${depot} plan: ${trips.length} trips, ${served} served, ${deferred.length} deferred`)
  return { ok: true, trips: trips.length, served, deferred: deferred.length }
}

// ---------- loader ----------

export function startLoading(w: World, tripId: string) {
  const t = getTrip(w, tripId)!
  if (t.status === 'published') t.status = 'loading'
}

export function markLoaded(w: World, orderId: string, loaded: boolean) {
  const o = getOrder(w, orderId)!
  o.loadState = loaded ? 'loaded' : 'pending'
  o.status = loaded ? 'loaded' : 'planned'
  const t = o.tripId ? getTrip(w, o.tripId) : undefined
  if (t && t.status === 'published') t.status = 'loading'
}

export function flagLoadIssue(w: World, orderId: string, kind: 'missing' | 'damaged', units: number, note: string) {
  const o = getOrder(w, orderId)!
  o.loadState = 'issue'
  o.status = 'planned'
  o.loadIssue = { kind, units, note }
  const t = o.tripId ? getTrip(w, o.tripId) : undefined
  notify(
    w,
    'dispatcher',
    o.depot,
    'Loading shortfall',
    `${o.ref} for ${outletName(o)}: ${units} units ${kind}${note ? ` (${note})` : ''}. Vehicle ${t?.vehicleId ?? ''} can't leave until you decide.`,
    'danger',
  )
  log(w, 'Loader', `Flagged ${units} units ${kind} on ${o.ref}`)
}

export function resolveLoadIssue(w: World, orderId: string, resolution: 'short_ship' | 'substitute' | 'defer', deferReason?: string) {
  const o = getOrder(w, orderId)!
  if (!o.loadIssue) return
  o.loadIssue.resolution = resolution
  if (resolution === 'defer') {
    deferOrder(w, orderId, deferReason ?? `Goods ${o.loadIssue.kind} at loading`)
    return
  }
  if (resolution === 'short_ship') {
    const keep = Math.max(1, o.units - o.loadIssue.units)
    const ratio = keep / o.units
    o.weightKg = Math.round(o.weightKg * ratio)
    o.volumeM3 = Math.round(o.volumeM3 * ratio * 10) / 10
    o.units = keep
    notify(w, 'manager', o.outletId, 'Order will arrive short', `${o.ref} will arrive with ${o.loadIssue.units} fewer units than ordered (${o.loadIssue.kind} at loading).`, 'warning')
  } else {
    notify(w, 'manager', o.outletId, 'Substitution on your order', `Some items on ${o.ref} are being substituted (${o.loadIssue.kind} at loading).`, 'info')
  }
  o.loadState = 'loaded'
  o.status = 'loaded'
  log(w, 'Dispatcher', `Resolved load issue on ${o.ref}: ${resolution}`)
}

export function confirmReady(w: World, tripId: string, seal: string): { ok: boolean; reason?: string } {
  const t = getTrip(w, tripId)!
  const os = ordersOfTrip(w, t)
  if (os.some((o) => o.loadState !== 'loaded')) return { ok: false, reason: 'Some orders are not loaded yet, or have an open issue.' }
  t.status = 'ready'
  t.seal = seal
  notify(w, 'driver', t.vehicleId, `Trip ${t.tripNo} is ready at the gate`, `Seal ${seal}. Do your pre-trip check and go.`, 'success')
  log(w, 'Loader', `${t.id} (${t.vehicleId}) ready, seal ${seal}`)
  return { ok: true }
}

// ---------- driver: server-side effects ----------

function srvStartTrip(w: World, tripId: string, pretrip: NonNullable<Trip['pretrip']>) {
  const t = getTrip(w, tripId)
  if (!t || !['ready', 'published', 'loading'].includes(t.status)) return
  t.status = 'departed'
  t.departedAt = now()
  t.pretrip = pretrip
  const os = ordersOfTrip(w, t)
  os.forEach((o, i) => {
    o.status = 'out'
    notify(w, 'manager', o.outletId, 'Your delivery has left the depot', `${o.ref} is on the way. ${i === 0 ? "It's the next stop." : `${i} stop${i === 1 ? '' : 's'} before yours.`}`, 'info')
  })
  log(w, `Driver ${getVehicle(w, t.vehicleId)?.driver ?? ''}`, `Started ${t.id}`)
}

function finishTripIfDone(w: World, t: Trip) {
  const os = ordersOfTrip(w, t)
  if (os.length > 0 && os.every((o) => o.outcome)) {
    t.status = 'done'
    const v = getVehicle(w, t.vehicleId)
    if (v) v.usedL = Math.round((v.usedL + tripFuelL(os, v)) * 10) / 10
    notify(w, 'dispatcher', t.depot, 'Trip completed', `${t.id} (${t.vehicleId}) finished all ${os.length} stops.`, 'success')
  }
}

function srvOutcome(w: World, orderId: string, outcome: Outcome) {
  const o = getOrder(w, orderId)
  if (!o) return
  o.outcome = outcome
  o.status = outcome.kind
  if (outcome.kind === 'partial' && outcome.unitsDelivered !== undefined) {
    // keep the record, the manager confirms what actually arrived
  }
  const label =
    outcome.kind === 'delivered' ? 'Delivered' : outcome.kind === 'partial' ? 'Partly delivered' : outcome.kind === 'refused' ? 'Refused at the door' : 'Delivery not completed'
  notify(
    w,
    'manager',
    o.outletId,
    label,
    outcome.kind === 'delivered' || outcome.kind === 'partial'
      ? `${o.ref} has arrived. Please confirm what you received.`
      : `${o.ref}: ${outcome.reason ?? 'the driver could not complete the delivery'}. Operations will follow up.`,
    outcome.kind === 'delivered' ? 'success' : 'warning',
  )
  if (outcome.kind !== 'delivered') {
    notify(w, 'dispatcher', o.depot, label, `${o.ref} at ${outletName(o)}${outcome.reason ? `: ${outcome.reason}` : ''}.`, 'warning')
  }
  const t = o.tripId ? getTrip(w, o.tripId) : undefined
  if (t) finishTripIfDone(w, t)
}

// ---------- driver: online or offline ----------

export function driverStartTrip(w: World, tripId: string, pretrip: NonNullable<Trip['pretrip']>) {
  if (w.d.online) {
    srvStartTrip(w, tripId, pretrip)
    refreshCaches(w)
    return
  }
  const c = w.d.cache[tripId]
  if (!c) return
  c.trip.status = 'departed'
  c.trip.pretrip = pretrip
  c.orders.forEach((o) => (o.status = 'out'))
  w.d.outbox.push({ id: `OB${Date.now()}${w.d.outbox.length}`, ts: now(), type: 'start_trip', tripId, pretrip })
}

export function driverOutcome(w: World, tripId: string, orderId: string, outcome: Omit<Outcome, 'at' | 'recordedOffline'>) {
  const full: Outcome = { ...outcome, at: now(), recordedOffline: !w.d.online }
  if (w.d.online) {
    srvOutcome(w, orderId, full)
    refreshCaches(w)
    return
  }
  const c = w.d.cache[tripId]
  if (!c) return
  const o = c.orders.find((x) => x.id === orderId)
  if (!o) return
  o.outcome = full
  o.status = full.kind
  if (c.orders.every((x) => x.outcome)) c.trip.status = 'done'
  w.d.outbox.push({ id: `OB${Date.now()}${w.d.outbox.length}`, ts: now(), type: 'outcome', tripId, orderId, outcome: full })
}

export function driverProblem(w: World, tripId: string, orderId: string | undefined, text: string) {
  if (w.d.online) {
    const t = getTrip(w, tripId)
    notify(w, 'dispatcher', t?.depot, 'Driver reported a problem', `${t?.vehicleId ?? ''}: ${text}`, 'danger')
    log(w, `Driver ${t ? getVehicle(w, t.vehicleId)?.driver : ''}`, `Problem: ${text}`)
    return
  }
  w.d.outbox.push({ id: `OB${Date.now()}${w.d.outbox.length}`, ts: now(), type: 'problem', tripId, orderId, text })
}

export function reportDevice(w: World, vehicleId: string, online: boolean) {
  const prev = w.s.devices[vehicleId]
  const ts = now()
  w.s.devices[vehicleId] = online ? { online: true, lastSeen: ts } : { online: false, since: prev?.since && !prev.online ? prev.since : ts, lastSeen: prev?.lastSeen ?? ts }
}

export function setOnline(w: World, online: boolean) {
  if (w.d.online === online) return
  w.d.online = online
  if (!online) {
    w.d.offlineSince = now()
    return
  }
  w.d.offlineSince = undefined
  syncNow(w)
}

export function syncNow(w: World) {
  if (!w.d.online) return
  const items = w.d.outbox
  w.d.outbox = []
  for (const item of items as OutboxItem[]) {
    if (item.type === 'start_trip') {
      srvStartTrip(w, item.tripId, item.pretrip)
    } else if (item.type === 'problem') {
      const t = getTrip(w, item.tripId)
      notify(w, 'dispatcher', t?.depot, 'Driver reported a problem (sent after reconnecting)', `${t?.vehicleId ?? ''}: ${item.text}`, 'danger')
    } else {
      const o = getOrder(w, item.orderId)
      const t = getTrip(w, item.tripId)
      if (!o || !t) continue
      let kind: Conflict['kind'] | null = null
      let note = ''
      if (o.status === 'deferred') {
        kind = 'deferred'
        note = `The dispatcher deferred this order${o.deferredAt ? ` at ${new Date(o.deferredAt).toLocaleTimeString('en-LK', { hour: 'numeric', minute: '2-digit' })}` : ''}: ${o.deferReason ?? 'no reason recorded'}.`
      } else if (o.tripId !== item.tripId) {
        kind = 'reassigned'
        note = 'The dispatcher moved this order onto another vehicle.'
      } else if (t.status === 'stranded') {
        kind = 'stranded'
        note = 'This trip was marked as stranded after a breakdown.'
      }
      if (kind) {
        w.d.conflicts.push({ id: `C${Date.now()}${w.d.conflicts.length}`, orderId: item.orderId, tripId: item.tripId, kind, serverNote: note, item, at: now() })
        notify(w, 'dispatcher', o.depot, 'Driver record conflicts with your change', `${o.ref}: the driver recorded "${item.outcome.kind}" while offline, but the plan changed. Waiting for the driver to confirm.`, 'warning')
      } else {
        srvOutcome(w, item.orderId, item.outcome)
      }
    }
  }
  refreshCaches(w)
  if (items.length > 0) log(w, 'Sync', `Applied ${items.length} offline record${items.length === 1 ? '' : 's'} from a driver device`)
}

export function resolveConflict(w: World, conflictId: string, choice: 'kept' | 'accepted') {
  const c = w.d.conflicts.find((x) => x.id === conflictId)
  if (!c || c.resolved) return
  const o = getOrder(w, c.orderId)
  if (!o) return
  if (choice === 'kept') {
    const t = getTrip(w, c.tripId)
    if (o.tripId && o.tripId !== c.tripId) {
      const other = getTrip(w, o.tripId)
      if (other) other.orderIds = other.orderIds.filter((id) => id !== o.id)
    }
    if (t && !t.orderIds.includes(o.id)) t.orderIds.push(o.id)
    o.tripId = c.tripId
    o.deferReason = undefined
    o.stranded = false
    srvOutcome(w, o.id, { ...c.item.outcome, recordedOffline: true })
    notify(w, 'dispatcher', o.depot, 'Driver kept their delivery record', `${o.ref} at ${outletName(o)} was physically delivered before the driver saw your change. The delivery is recorded. Please review.`, 'warning')
    log(w, 'Driver', `Kept offline record for ${o.ref} over the dispatcher change`)
  } else {
    notify(w, 'dispatcher', o.depot, 'Driver accepted your change', `${o.ref} at ${outletName(o)} stays ${o.status}. The driver's offline record was discarded.`, 'info')
    log(w, 'Driver', `Accepted dispatcher change for ${o.ref}`)
  }
  c.resolved = choice
  refreshCaches(w)
}

// ---------- store manager ----------

export function confirmReceipt(
  w: World,
  orderId: string,
  unitsReceived: number,
  issue?: { kind: 'missing' | 'damaged' | 'wrong_item'; note: string },
) {
  const o = getOrder(w, orderId)!
  const expected = o.outcome?.unitsDelivered ?? o.units
  const auto = !issue && unitsReceived < expected ? { kind: 'missing' as const, note: `${expected - unitsReceived} units short` } : issue
  o.receipt = { at: now(), unitsReceived, issue: auto }
  if (auto) {
    notify(w, 'dispatcher', o.depot, 'Receipt issue reported', `${outletName(o)} on ${o.ref}: ${auto.kind.replace('_', ' ')}${auto.note ? `, ${auto.note}` : ''}.`, 'danger')
  }
  log(w, outletName(o), `Confirmed receipt of ${o.ref} (${unitsReceived}/${expected})${auto ? ` with issue: ${auto.kind}` : ''}`)
}

// ---------- fleet / scenarios ----------

export function setVehicleStatus(w: World, vehicleId: string, status: VehicleStatus) {
  const v = getVehicle(w, vehicleId)!
  v.status = status
  log(w, 'Dispatcher', `${vehicleId} marked ${status.replace('_', ' ')}`)
}

export function exhaustFuel(w: World, vehicleId: string) {
  const v = getVehicle(w, vehicleId)!
  v.usedL = Math.max(v.usedL, v.weeklyQuotaL - 4)
  const has = activeTrips(w, vehicleId).some((t) => ['draft', 'published', 'loading', 'ready'].includes(t.status))
  notify(
    w,
    'dispatcher',
    v.depot,
    'Fuel quota nearly used up',
    `${vehicleId} has only ${Math.max(0, v.weeklyQuotaL - v.usedL).toFixed(0)} L of weekly fuel left${has ? ", and it has planned trips it can't complete. Reassign them." : '.'} The quota resets on Sunday.`,
    'danger',
  )
  log(w, 'Fleet', `${vehicleId} fuel quota nearly exhausted`)
}

export function breakVehicle(w: World, vehicleId: string) {
  const v = getVehicle(w, vehicleId)!
  v.status = 'broken_down'
  for (const t of activeTrips(w, vehicleId)) {
    if (t.status === 'done') continue
    t.status = 'stranded'
    t.version += 1
    t.changes.push({ v: t.version, at: now(), text: `${vehicleId} broke down. Remaining stops are being reassigned.` })
    for (const o of ordersOfTrip(w, t)) {
      if (o.outcome) continue
      o.status = 'confirmed'
      o.stranded = true
      o.loadState = 'pending'
      notify(w, 'manager', o.outletId, 'Delivery delayed', `${o.ref} is delayed because the vehicle broke down. Operations are arranging another vehicle. We'll send a new arrival window.`, 'warning')
    }
    // keep stranded orders on the stranded trip record for the audit trail, but free them for reassignment
    t.orderIds = t.orderIds.filter((id) => getOrder(w, id)?.outcome)
    for (const o of w.s.orders) if (o.stranded && o.tripId === t.id) o.tripId = undefined
  }
  notify(w, 'dispatcher', v.depot, 'Vehicle breakdown', `${vehicleId} broke down. Its undelivered stops need a new vehicle.`, 'danger')
  notify(w, 'driver', vehicleId, 'Stay with the vehicle', 'Dispatch has been told. Undelivered stops are being moved to another vehicle.', 'warning')
  log(w, 'Fleet', `${vehicleId} broke down`)
}

export function markRead(w: World, ids: string[]) {
  const set = new Set(ids)
  w.s.notices.forEach((n) => {
    if (set.has(n.id)) n.read = true
  })
}

export function ackVersion(w: World, key: string, version: number) {
  w.s.seen[key] = version
}

export const vehicleFuelLeft = (v: Vehicle) => Math.max(0, v.weeklyQuotaL - v.usedL)
