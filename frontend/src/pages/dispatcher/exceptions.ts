import { getTrip, getVehicle, outletName, planIssues } from '@/domain/engine'
import { errorsOf } from '@/domain/rules'
import type { Depot, World } from '@/domain/types'

export interface Exception {
  id: string
  kind: 'load' | 'stranded' | 'failed' | 'plan' | 'receipt' | 'offline'
  severity: 'danger' | 'warning' | 'info'
  title: string
  body: string
  orderId?: string
  tripId?: string
}

export function collectExceptions(w: World, depot: Depot): Exception[] {
  const out: Exception[] = []
  for (const o of w.s.orders.filter((x) => x.depot === depot)) {
    if (o.loadIssue && !o.loadIssue.resolution) {
      out.push({
        id: `load-${o.id}`,
        kind: 'load',
        severity: 'danger',
        title: `Loading shortfall on ${o.ref}`,
        body: `${outletName(o)}: ${o.loadIssue.units} units ${o.loadIssue.kind}. The vehicle can't be sealed until you decide.`,
        orderId: o.id,
        tripId: o.tripId,
      })
    }
    if (o.stranded && o.status === 'confirmed') {
      out.push({
        id: `str-${o.id}`,
        kind: 'stranded',
        severity: 'danger',
        title: `${o.ref} is stranded`,
        body: `${outletName(o)} lost its vehicle. Move it to another vehicle or defer it.`,
        orderId: o.id,
      })
    }
    if (o.status === 'failed' || o.status === 'refused') {
      out.push({
        id: `fail-${o.id}`,
        kind: 'failed',
        severity: 'warning',
        title: `${o.ref} was not delivered`,
        body: `${outletName(o)}: ${o.outcome?.reason ?? o.status}.`,
        orderId: o.id,
      })
    }
    if (o.receipt?.issue) {
      out.push({
        id: `rec-${o.id}`,
        kind: 'receipt',
        severity: 'warning',
        title: `Receipt issue at ${outletName(o)}`,
        body: `${o.ref}: ${o.receipt.issue.kind.replace('_', ' ')}${o.receipt.issue.note ? `, ${o.receipt.issue.note}` : ''}.`,
        orderId: o.id,
      })
    }
  }
  for (const p of planIssues(w)) {
    const trip = getTrip(w, p.tripId)
    if (!trip || trip.depot !== depot) continue
    const errs = errorsOf(p.issues)
    if (errs.length) {
      out.push({
        id: `plan-${p.tripId}`,
        kind: 'plan',
        severity: 'danger',
        title: `${p.vehicleId} trip ${trip.tripNo} breaks a rule`,
        body: errs[0].message,
        tripId: p.tripId,
      })
    }
  }
  for (const [vid, d] of Object.entries(w.s.devices)) {
    const v = getVehicle(w, vid)
    if (v && v.depot === depot && !d.online) {
      out.push({
        id: `off-${vid}`,
        kind: 'offline',
        severity: 'info',
        title: `${vid} has no signal`,
        body: `${v.driver}'s phone went offline at ${new Date(d.since ?? d.lastSeen).toLocaleTimeString('en-LK', { hour: 'numeric', minute: '2-digit' })}. Their records will arrive when it reconnects.`,
        tripId: undefined,
      })
    }
  }
  const rank = { danger: 0, warning: 1, info: 2 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity])
}
