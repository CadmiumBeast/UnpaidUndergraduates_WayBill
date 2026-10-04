import { ArrowDown, ArrowUp, ChevronDown, CircleCheck, CircleX, Fuel, Snowflake, Truck, X } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { BrandTag, Chip, TempTag } from '@/components/domain/chips'
import { BudgetBar } from '@/components/domain/BudgetBar'
import { IssueList } from '@/components/domain/IssueList'
import { Button } from '@/components/ui/button'
import { Field, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  assignOrder,
  deferOrder,
  getOrder,
  ordersOfTrip,
  outletName,
  previewAssign,
  reorderStop,
  resolveLoadIssue,
  tripsOfVehicle,
  unassignOrder,
  vehicleFuelLeft,
  type PlanIssue,
} from '@/domain/engine'
import { OUTLET_BY_ID } from '@/domain/reference'
import { errorsOf, warningsOf } from '@/domain/rules'
import type { Order, Trip, Vehicle, World } from '@/domain/types'
import { fmt12, fmtDuration } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function OrderSummary({ order }: { order: Order }) {
  const outlet = OUTLET_BY_ID[order.outletId]
  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{outletName(order)}</span>
        <BrandTag brand={order.brand} />
        <TempTag temp={order.temp} />
        {outlet.parking === 'van_only' && <Chip tone="late" icon={Truck}>Van only</Chip>}
        {outlet.mallWindow && <Chip tone="late">Mall window {outlet.mallWindow[0]} to {outlet.mallWindow[1]}</Chip>}
        {order.deferredYesterday && <Chip tone="deferred">Skipped yesterday</Chip>}
      </div>
      <p className="text-sm text-muted-foreground">
        {order.ref} · {order.units} units · {order.weightKg.toLocaleString()} kg · {order.volumeM3} m³ · {order.district}
      </p>
    </div>
  )
}

export function AssignModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const [showAll, setShowAll] = React.useState<string | null>(null)
  const order = orderId ? getOrder(world, orderId) : undefined

  const rows = React.useMemo(() => {
    if (!order) return []
    return world.s.vehicles
      .filter((v) => v.depot === order.depot)
      .map((v) => {
        const options = ([1, 2] as const).map((n) => ({ tripNo: n, p: previewAssign(world, order.id, v.id, n) }))
        const fits = options.filter((o) => o.p.ok)
        return { v, options, fits }
      })
      .sort((a, b) => Number(b.fits.length > 0) - Number(a.fits.length > 0) || a.v.id.localeCompare(b.v.id))
  }, [world, order])

  if (!order) return null
  const doAssign = (v: Vehicle, tripNo: 1 | 2) => {
    const res = act((w) => assignOrder(w, order.id, v.id, tripNo))
    if (res.ok) {
      toast.success(`${order.ref} assigned to ${v.id}, trip ${tripNo}`)
      onClose()
    } else toast.error("That assignment breaks a rule, so it wasn't made.")
  }

  return (
    <Modal open={!!orderId} onClose={onClose} title="Where can this order go?" size="lg">
      <div className="space-y-4">
        <OrderSummary order={order} />
        <p className="text-sm text-muted-foreground">
          Vehicles that can take it are first. For the others, you can see exactly which rule stops the assignment.
        </p>
        <ul className="space-y-2">
          {rows.map(({ v, options, fits }) => {
            const t = tripsOfVehicle(world, v.id).filter((x) => x.status !== 'stranded')
            const first = options[0].p.issues.filter((i) => i.severity === 'error')
            const second = options[1].p.issues.filter((i) => i.severity === 'error')
            const blockers = first.length <= second.length ? first : second
            return (
              <li key={v.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{v.id}</span>
                    <span className="text-sm text-muted-foreground">
                      {v.type === 'van' ? 'Van' : 'Truck'} · {v.temp === 'reefer' ? 'Refrigerated' : 'Ambient'} · {v.driver}
                    </span>
                    {v.status !== 'available' && <Chip tone="offline">{v.status === 'in_workshop' ? 'In workshop' : 'Broken down'}</Chip>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.length} of 2 trips · fuel left {vehicleFuelLeft(v).toFixed(0)} L
                  </span>
                </div>
                {fits.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fits.map(({ tripNo, p }) => {
                      const warn = warningsOf(p.issues)
                      return (
                        <Button key={tripNo} variant="outline" onClick={() => doAssign(v, tripNo)} className="h-auto flex-col items-start gap-0.5 py-2 text-left">
                          <span className="flex items-center gap-1 font-semibold">
                            <CircleCheck className="size-4 text-served" /> Trip {tripNo}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {p.metrics.weightKg.toLocaleString()} / {v.weightCap.toLocaleString()} kg · {fmtDuration(p.metrics.minutes)}
                            {warn.length > 0 && ` · ${warn.length} warning`}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-start gap-2 text-sm text-deferred-fg">
                      <CircleX className="mt-0.5 size-4 shrink-0" /> {blockers[0]?.message ?? 'Not available'}
                    </p>
                    {blockers.length > 1 && (
                      <button className="flex items-center gap-1 text-xs text-muted-foreground underline" onClick={() => setShowAll(showAll === v.id ? null : v.id)}>
                        <ChevronDown className="size-3.5" /> {showAll === v.id ? 'Hide' : `Show ${blockers.length - 1} more reason${blockers.length === 2 ? '' : 's'}`}
                      </button>
                    )}
                    {showAll === v.id && <IssueList issues={blockers.slice(1)} />}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}

const REASONS = [
  'Not enough refrigerated capacity',
  'Fresh time budget is used up',
  'All suitable vehicles are full',
  "Fuel quota can't cover the distance",
  'Outlet asked to reschedule',
  'Other (write below)',
]

export function DeferModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const order = orderId ? getOrder(world, orderId) : undefined
  const [reason, setReason] = React.useState(REASONS[0])
  const [note, setNote] = React.useState('')
  React.useEffect(() => {
    if (order?.deferReason) {
      const match = REASONS.find((r) => order.deferReason === r)
      setReason(match ?? 'Other (write below)')
      setNote(match ? '' : order.deferReason)
    } else {
      setReason(REASONS[0])
      setNote('')
    }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!order) return null
  const other = reason.startsWith('Other')
  const final = other ? note.trim() : note.trim() ? `${reason}. ${note.trim()}` : reason
  const invalid = other && !note.trim()
  return (
    <Modal
      open={!!orderId}
      onClose={onClose}
      title="Defer this order"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={invalid}
            onClick={() => {
              act((w) => deferOrder(w, order.id, final))
              toast(`${order.ref} deferred to the next run`)
              onClose()
            }}
          >
            Defer to the next run
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <OrderSummary order={order} />
        {order.deferredYesterday && (
          <div className="rounded-lg border border-deferred/40 bg-deferred-bg px-3 py-2 text-sm text-deferred-fg">
            <strong>Second skip in a row.</strong> This outlet was already skipped yesterday and has waited {order.daysSinceLastServed} days. If you can free
            capacity for it, that is fairer than deferring it again.
          </div>
        )}
        <Field label="Reason (the store manager will see this)">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label={other ? 'Reason' : 'Extra detail (optional)'}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: chilled trucks are all committed to Colombo" />
        </Field>
      </div>
    </Modal>
  )
}

export function ResolveIssueModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const order = orderId ? getOrder(world, orderId) : undefined
  const [choice, setChoice] = React.useState<'short_ship' | 'substitute' | 'defer'>('short_ship')
  if (!order || !order.loadIssue) return null
  const issue = order.loadIssue
  const opts = [
    { v: 'short_ship' as const, t: 'Ship what we have', d: `Deliver ${Math.max(1, order.units - issue.units)} of ${order.units} units. The store is told it will arrive short.` },
    { v: 'substitute' as const, t: 'Substitute items', d: 'Send replacements for the affected items. The store is told about the substitution.' },
    { v: 'defer' as const, t: 'Defer this order', d: 'Take it off the trip and move it to the next run. The store is told why.' },
  ]
  return (
    <Modal
      open={!!orderId}
      onClose={onClose}
      title="Loading shortfall"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Not yet</Button>
          <Button
            onClick={() => {
              act((w) => resolveLoadIssue(w, order.id, choice))
              toast.success('Decision recorded and sent to the loader and the store')
              onClose()
            }}
          >
            Confirm decision
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <OrderSummary order={order} />
        <p className="rounded-lg bg-deferred-bg px-3 py-2 text-sm text-deferred-fg">
          The loader reported <strong>{issue.units} units {issue.kind}</strong>{issue.note ? ` (${issue.note})` : ''}. The vehicle can't be sealed until you decide.
        </p>
        <div className="space-y-2" role="radiogroup">
          {opts.map((o) => (
            <label key={o.v} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${choice === o.v ? 'border-primary bg-accent' : ''}`}>
              <input type="radio" name="res" className="mt-1 size-4 accent-[var(--primary)]" checked={choice === o.v} onChange={() => setChoice(o.v)} />
              <span>
                <span className="block font-semibold">{o.t}</span>
                <span className="block text-sm text-muted-foreground">{o.d}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function TripBlock({
  world,
  vehicle,
  tripNo,
  trip,
  plan,
  onMove,
  onDefer,
  editable = true,
}: {
  world: World
  vehicle: Vehicle
  tripNo: 1 | 2
  trip?: Trip
  plan?: PlanIssue
  onMove: (orderId: string) => void
  onDefer: (orderId: string) => void
  editable?: boolean
}) {
  const act = useStore((s) => s.act)
  if (!trip) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
        Trip {tripNo}: nothing planned yet
      </div>
    )
  }
  const orders = ordersOfTrip(world, trip)
  const m = plan?.metrics
  const errs = plan ? errorsOf(plan.issues) : []
  const warns = plan ? warningsOf(plan.issues) : []
  return (
    <div className={`rounded-lg border p-3 ${errs.length ? 'border-deferred/60' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Trip {tripNo}</span>
          <BrandTag brand={trip.brand} />
          <span className="text-sm text-muted-foreground">{trip.district}</span>
          {trip.status !== 'draft' && <Chip tone="ontime">v{trip.version} · {trip.status}</Chip>}
        </div>
        {m && (
          <span className="text-xs text-muted-foreground">
            Leaves {fmt12(m.departMin)}
            {m.latestDepartMin !== undefined && (
              <> · <strong className={m.latestDepartMin - m.departMin < 15 ? 'text-late-fg' : ''}>latest safe {fmt12(m.latestDepartMin)}</strong></>
            )}
          </span>
        )}
      </div>
      <ol className="mt-2 space-y-1">
        {orders.map((o, i) => (
          <li key={o.id} className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-sm">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {outletName(o)} <span className="text-muted-foreground">· {o.ref}</span>
            </span>
            {o.temp === 'chilled' && <Snowflake className="size-4 shrink-0 text-chilled" aria-label="Chilled" />}
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{o.units} u</span>
            {editable && (
              <span className="flex shrink-0 items-center">
                <button aria-label="Move up" className="grid size-8 place-items-center rounded hover:bg-accent disabled:opacity-30" disabled={i === 0} onClick={() => act((w) => reorderStop(w, trip.id, o.id, -1))}>
                  <ArrowUp className="size-4" />
                </button>
                <button aria-label="Move down" className="grid size-8 place-items-center rounded hover:bg-accent disabled:opacity-30" disabled={i === orders.length - 1} onClick={() => act((w) => reorderStop(w, trip.id, o.id, 1))}>
                  <ArrowDown className="size-4" />
                </button>
                <button className="h-8 rounded px-2 text-xs font-medium hover:bg-accent" onClick={() => onMove(o.id)}>Move</button>
                <button className="h-8 rounded px-2 text-xs font-medium text-deferred-fg hover:bg-deferred-bg" onClick={() => onDefer(o.id)}>Defer</button>
                <button aria-label="Remove from trip" className="grid size-8 place-items-center rounded hover:bg-accent" onClick={() => act((w) => unassignOrder(w, o.id))}>
                  <X className="size-4" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {m && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <BudgetBar label="Weight" value={m.weightKg} max={m.weightCap} unit="kg" compact />
          <BudgetBar label="Volume" value={m.volumeM3} max={m.volumeCap} unit="m³" decimals={1} compact />
          <BudgetBar label={m.budgetClass === 'fresh' ? 'Fresh time budget (this vehicle)' : 'Style and Tech time budget'} value={m.budgetUsed} max={m.budgetMax} unit="min" compact />
          <BudgetBar label="Weekly fuel (all today's trips)" value={m.fuelPlannedL} max={m.fuelRemainingL || 0.0001} unit="L left" decimals={0} compact />
        </div>
      )}
      {(errs.length > 0 || warns.length > 0) && <IssueList issues={[...errs, ...warns]} className="mt-3" />}
    </div>
  )
}

export function VehicleHeader({ vehicle, trips }: { vehicle: Vehicle; trips: Trip[] }) {
  const left = vehicleFuelLeft(vehicle)
  const low = left < 30
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">{vehicle.id}</span>
        <span className="text-sm text-muted-foreground">
          {vehicle.type === 'van' ? 'Van' : 'Truck'} · {vehicle.weightCap.toLocaleString()} kg · {vehicle.volumeCap} m³
        </span>
        {vehicle.temp === 'reefer' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-chilled-bg px-1.5 py-0.5 text-xs font-semibold text-chilled">
            <Snowflake className="size-3.5" /> Refrigerated
          </span>
        ) : (
          <TempTag temp="ambient" />
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{vehicle.driver}</span>
        <Chip tone={low ? 'late' : 'served'} icon={Fuel}>{left.toFixed(0)} L left</Chip>
        <span>{trips.length} of 2 trips</span>
      </div>
    </div>
  )
}
