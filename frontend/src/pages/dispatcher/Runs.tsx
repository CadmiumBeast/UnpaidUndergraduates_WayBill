import { CircleAlert, TriangleAlert, WifiOff } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { Chip, OrderStatusChip } from '@/components/domain/chips'
import { EmptyState, PageHeader } from '@/components/domain/misc'
import { RouteLine, type RouteStep } from '@/components/domain/RouteLine'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { getVehicle, ordersOfTrip, outletName, planIssues } from '@/domain/engine'
import type { Trip } from '@/domain/types'
import { clockTime, fmt12 } from '@/lib/utils'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'
import { collectExceptions } from './exceptions'
import { AssignModal, DeferModal, ResolveIssueModal } from './parts'

export function Runs() {
  const world = useStore((s) => s.world)
  const depot = useDepot()
  const [tab, setTab] = React.useState<'all' | 'road' | 'loading' | 'done'>('all')
  const [assign, setAssign] = React.useState<string | null>(null)
  const [defer, setDefer] = React.useState<string | null>(null)
  const [resolve, setResolve] = React.useState<string | null>(null)
  const s = world.s

  const trips = s.trips.filter((t) => t.depot === depot && t.status !== 'draft')
  const shown = trips.filter((t) => {
    if (tab === 'road') return t.status === 'departed'
    if (tab === 'loading') return ['published', 'loading', 'ready'].includes(t.status)
    if (tab === 'done') return t.status === 'done' || t.status === 'stranded'
    return true
  })
  const exceptions = collectExceptions(world, depot)
  const plan = planIssues(world)

  const stepsFor = (t: Trip): RouteStep[] => {
    const orders = ordersOfTrip(world, t)
    const p = plan.find((x) => x.tripId === t.id)
    const firstPending = orders.findIndex((o) => !o.outcome)
    return orders.map((o, i) => {
      const eta = p?.metrics.etas.find((e) => e.orderId === o.id)
      const done = !!o.outcome
      const bad = o.status === 'failed' || o.status === 'refused'
      const state: RouteStep['state'] = bad ? 'issue' : done ? 'done' : t.status === 'departed' && i === firstPending ? 'current' : 'next'
      return {
        id: o.id,
        state,
        title: (
          <span className="flex flex-wrap items-center gap-2">
            {outletName(o)} <OrderStatusChip status={o.status} />
          </span>
        ),
        sub: done
          ? `${o.outcome!.kind === 'delivered' ? 'Delivered' : o.outcome!.kind} at ${clockTime(o.outcome!.at)}${o.outcome!.recordedOffline ? ' (recorded offline)' : ''}${o.receipt ? (o.receipt.issue ? ' · store reported an issue' : ' · store confirmed') : ''}`
          : `${o.ref} · ${o.units} units${o.loadState === 'loaded' ? ' · loaded' : o.loadState === 'issue' ? ' · shortfall' : ''}`,
        aside: !done && eta ? `ETA ${fmt12(eta.arriveMin)}` : undefined,
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Live runs" sub="Every trip, every stop, and the things that need a decision." />

      <Card className={exceptions.filter((e) => e.severity !== 'info').length ? 'border-deferred/40' : ''}>
        <CardHeader>
          <CardTitle>Needs your attention</CardTitle>
          <span className="text-sm text-muted-foreground">{exceptions.length}</span>
        </CardHeader>
        <CardBody className="space-y-2">
          {exceptions.length === 0 && <p className="text-sm text-muted-foreground">No exceptions. Everything is moving as planned.</p>}
          {exceptions.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
              {e.kind === 'offline' ? (
                <WifiOff className="mt-0.5 size-5 shrink-0 text-offline" />
              ) : e.severity === 'danger' ? (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-deferred" />
              ) : (
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-late" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-muted-foreground">{e.body}</p>
              </div>
              <div className="flex gap-2">
                {e.kind === 'load' && <Button size="sm" onClick={() => setResolve(e.orderId!)}>Decide</Button>}
                {e.kind === 'stranded' && (
                  <>
                    <Button size="sm" onClick={() => setAssign(e.orderId!)}>Move to a vehicle</Button>
                    <Button size="sm" variant="outline" onClick={() => setDefer(e.orderId!)}>Defer</Button>
                  </>
                )}
                {e.kind === 'failed' && <Button size="sm" variant="outline" onClick={() => setDefer(e.orderId!)}>Reschedule</Button>}
                {e.kind === 'plan' && (
                  <Link className={buttonVariants({ size: 'sm', variant: 'outline' })} to="/dispatcher/planning">
                    Fix on the board
                  </Link>
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'all', label: 'All trips', count: trips.length },
          { value: 'loading', label: 'Loading', count: trips.filter((t) => ['published', 'loading', 'ready'].includes(t.status)).length },
          { value: 'road', label: 'On the road', count: trips.filter((t) => t.status === 'departed').length },
          { value: 'done', label: 'Finished', count: trips.filter((t) => t.status === 'done' || t.status === 'stranded').length },
        ]}
      />

      {trips.length === 0 ? (
        <EmptyState title="No published trips yet">Publish the plan on the planning board and trips will appear here.</EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((t) => {
            const v = getVehicle(world, t.vehicleId)!
            const orders = ordersOfTrip(world, t)
            const done = orders.filter((o) => o.outcome).length
            const dev = s.devices[t.vehicleId]
            const loaded = orders.filter((o) => o.loadState === 'loaded').length
            return (
              <Card key={t.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{t.vehicleId} · Trip {t.tripNo}</CardTitle>
                      <Chip tone={t.status === 'done' ? 'served' : t.status === 'stranded' ? 'deferred' : t.status === 'departed' ? 'syncing' : 'ontime'}>
                        {t.status === 'stranded' ? 'Stranded' : t.status === 'done' ? 'Finished' : t.status === 'departed' ? 'On the road' : t.status === 'ready' ? 'Sealed, ready' : 'Loading'}
                      </Chip>
                      {dev && !dev.online && <Chip tone="offline" icon={WifiOff}>No signal since {clockTime(dev.since ?? dev.lastSeen)}</Chip>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {v.driver} · {t.brand} · {t.district} · plan v{t.version}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {t.status === 'departed' || t.status === 'done' ? `${done} of ${orders.length} stops` : `${loaded} of ${orders.length} loaded`}
                  </span>
                </CardHeader>
                <CardBody className="space-y-3">
                  {t.status === 'stranded' && <p className="rounded-md bg-deferred-bg px-3 py-2 text-sm text-deferred-fg">{v.id} broke down. Undelivered stops were released for reassignment.</p>}
                  <RouteLine steps={stepsFor(t)} />
                  {t.status === 'departed' &&
                    orders
                      .filter((o) => !o.outcome)
                      .slice(0, 1)
                      .map((o) => (
                        <div key={o.id} className="flex flex-wrap gap-2 border-t pt-3">
                          <span className="self-center text-xs text-muted-foreground">Next stop: {outletName(o)}</span>
                          <Button size="sm" variant="outline" onClick={() => setAssign(o.id)}>Move to another vehicle</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDefer(o.id)}>Reschedule stop</Button>
                        </div>
                      ))}
                  {t.changes.length > 0 && (
                    <details className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                      <summary className="cursor-pointer font-medium">Plan history ({t.changes.length})</summary>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {[...t.changes].reverse().map((c) => (
                          <li key={c.v}>
                            v{c.v} · {clockTime(c.at)} · {c.text}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
      <AssignModal orderId={assign} onClose={() => setAssign(null)} />
      <DeferModal orderId={defer} onClose={() => setDefer(null)} />
      <ResolveIssueModal orderId={resolve} onClose={() => setResolve(null)} />
    </div>
  )
}
