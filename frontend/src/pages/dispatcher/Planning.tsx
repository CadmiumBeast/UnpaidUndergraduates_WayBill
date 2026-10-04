import { Lock, Send, Sparkles, Snowflake } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { BrandTag, Chip } from '@/components/domain/chips'
import { EmptyState, PageHeader } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { closeOrders, ordersOfTrip, outletName, planIssues, publishPlan, runAutoPlan, tripsOfVehicle } from '@/domain/engine'
import { errorsOf } from '@/domain/rules'
import type { Order } from '@/domain/types'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'
import { AssignModal, DeferModal, TripBlock, VehicleHeader } from './parts'

export function Planning() {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const depot = useDepot()
  const [assign, setAssign] = React.useState<string | null>(null)
  const [defer, setDefer] = React.useState<string | null>(null)
  const [onlyBusy, setOnlyBusy] = React.useState(false)
  const s = world.s

  const orders = s.orders.filter((o) => o.depot === depot && o.status !== 'next_run')
  const toPlace = orders.filter((o) => o.status === 'confirmed')
  const deferred = orders.filter((o) => o.status === 'deferred')
  const trips = s.trips.filter((t) => t.depot === depot && t.status !== 'stranded')
  const drafts = trips.filter((t) => t.status === 'draft')
  const issues = React.useMemo(() => planIssues(world), [world])
  const issueByTrip = new Map(issues.map((p) => [p.tripId, p]))
  const errorTrips = issues.filter((p) => errorsOf(p.issues).length > 0 && trips.some((t) => t.id === p.tripId))
  const vehicles = s.vehicles.filter((v) => v.depot === depot)
  const published = s.phase === 'published' && trips.some((t) => t.status !== 'draft')
  const locked = s.phase === 'ordering'

  const groups = React.useMemo(() => {
    const m = new Map<string, Order[]>()
    for (const o of toPlace) {
      const k = `${o.brand} · ${o.district}`
      m.set(k, [...(m.get(k) ?? []), o])
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [toPlace])

  const canPublish = !locked && toPlace.length === 0 && errorTrips.length === 0 && drafts.length > 0
  const reason = locked
    ? 'Close orders first'
    : toPlace.length > 0
      ? `${toPlace.length} orders still need a vehicle or a deferral`
      : errorTrips.length > 0
        ? `${errorTrips.length} trips break a rule`
        : drafts.length === 0
          ? 'Nothing to publish'
          : ''

  return (
    <div className="space-y-5">
      <PageHeader
        title="Planning board"
        sub="Give every order a vehicle or a reason. The board checks every rule as you go."
        actions={
          <>
            <Button
              variant="outline"
              disabled={locked || published}
              onClick={() => {
                if (drafts.length > 0 && !window.confirm('This replaces the draft trips with a fresh suggestion. Continue?')) return
                const res = act((w) => runAutoPlan(w, depot))
                toast.success(`Suggested ${res.trips.length} trips. ${res.deferred.length} orders deferred.`)
              }}
            >
              <Sparkles /> Suggest a plan
            </Button>
            {published ? (
              <Chip tone="served">Published. Changes now create a new version</Chip>
            ) : (
              <Button
                disabled={!canPublish}
                title={reason}
                onClick={() => {
                  const res = act((w) => publishPlan(w, depot))
                  if (res.ok) toast.success(`Published: ${res.trips} trips, ${res.served} orders served, ${res.deferred} deferred. Loaders, drivers and stores are notified.`)
                  else toast.error(res.reason)
                }}
              >
                <Send /> Publish plan
              </Button>
            )}
          </>
        }
      />

      {locked && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-ontime/40 bg-ontime-bg p-4 text-ontime-fg">
          <p className="flex items-center gap-2 font-medium">
            <Lock className="size-5" /> Orders are open until 4:00 PM, so the queue isn't final yet.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm('Close orders now?')) act((w) => closeOrders(w))
            }}
          >
            Close orders now
          </Button>
        </Card>
      )}

      {published && (
        <p className="rounded-lg border border-served/40 bg-served-bg px-4 py-3 text-sm text-served-fg">
          The plan is out. Moving or deferring anything now records a new version of that trip and alerts the loader, the driver and the store.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <Chip tone={toPlace.length ? 'late' : 'served'}>{toPlace.length} to place</Chip>
        <Chip tone="ontime">{trips.length} trips</Chip>
        <Chip tone={deferred.length ? 'deferred' : 'offline'}>{deferred.length} deferred</Chip>
        <Chip tone={errorTrips.length ? 'deferred' : 'served'}>{errorTrips.length ? `${errorTrips.length} rule breaks` : 'All trips valid'}</Chip>
        {!canPublish && !published && reason && <span className="self-center text-muted-foreground">Publish is off: {reason.toLowerCase()}</span>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
        <div className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-7rem)] xl:self-start xl:overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>To place</CardTitle>
              <span className="text-sm text-muted-foreground">{toPlace.length}</span>
            </CardHeader>
            <CardBody className="space-y-4">
              {groups.length === 0 && <p className="text-sm text-muted-foreground">Every order has a trip or a deferral.</p>}
              {groups.map(([label, list]) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label} ({list.length})</p>
                  {list.map((o) => (
                    <div key={o.id} className="rounded-lg border p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{outletName(o)}</span>
                        {o.temp === 'chilled' && <Snowflake className="size-4 shrink-0 text-chilled" aria-label="Chilled" />}
                        {o.deferredYesterday && <Chip tone="deferred">Skipped yesterday</Chip>}
                        {o.stranded && <Chip tone="late">Stranded</Chip>}
                      </div>
                      <p className="text-xs text-muted-foreground">{o.ref} · {o.units} units · {o.weightKg.toLocaleString()} kg · {o.volumeM3} m³</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => setAssign(o.id)}>Assign</Button>
                        <Button size="sm" variant="outline" onClick={() => setDefer(o.id)}>Defer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deferred</CardTitle>
              <span className="text-sm text-muted-foreground">{deferred.length}</span>
            </CardHeader>
            <CardBody className="space-y-2">
              {deferred.length === 0 && <p className="text-sm text-muted-foreground">No deferrals.</p>}
              {deferred.map((o) => (
                <div key={o.id} className="rounded-lg border border-deferred/30 bg-deferred-bg/30 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{outletName(o)}</span>
                    <BrandTag brand={o.brand} />
                  </div>
                  <p className="text-xs text-deferred-fg">{o.deferReason}</p>
                  {o.deferredYesterday && <p className="mt-1 text-xs font-semibold text-deferred-fg">Second skip in a row</p>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAssign(o.id)}>Try to fit it in</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDefer(o.id)}>Edit reason</Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vehicles</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={onlyBusy} onChange={(e) => setOnlyBusy(e.target.checked)} />
              Only vehicles with trips
            </label>
          </div>
          {vehicles.filter((v) => v.status === 'available').length === 0 && <EmptyState title="No vehicles available" />}
          {vehicles
            .filter((v) => v.status === 'available')
            .filter((v) => !onlyBusy || tripsOfVehicle(world, v.id).some((t) => t.status !== 'stranded'))
            .map((v) => {
              const vt = tripsOfVehicle(world, v.id).filter((t) => t.status !== 'stranded')
              const t1 = vt.find((t) => t.tripNo === 1)
              const t2 = vt.find((t) => t.tripNo === 2)
              return (
                <Card key={v.id}>
                  <CardBody className="space-y-3">
                    <VehicleHeader vehicle={v} trips={vt} />
                    <TripBlock world={world} vehicle={v} tripNo={1} trip={t1} plan={t1 ? issueByTrip.get(t1.id) : undefined} onMove={setAssign} onDefer={setDefer} />
                    {(t1 || t2) && <TripBlock world={world} vehicle={v} tripNo={2} trip={t2} plan={t2 ? issueByTrip.get(t2.id) : undefined} onMove={setAssign} onDefer={setDefer} />}
                  </CardBody>
                </Card>
              )
            })}
          {vehicles.some((v) => v.status !== 'available') && (
            <Card>
              <CardHeader>
                <CardTitle>Out of service</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-wrap gap-2">
                {vehicles
                  .filter((v) => v.status !== 'available')
                  .map((v) => (
                    <Chip key={v.id} tone="offline">
                      {v.id} · {v.status === 'in_workshop' ? 'workshop' : 'broken down'}
                    </Chip>
                  ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <AssignModal orderId={assign} onClose={() => setAssign(null)} />
      <DeferModal orderId={defer} onClose={() => setDefer(null)} />
    </div>
  )
}
