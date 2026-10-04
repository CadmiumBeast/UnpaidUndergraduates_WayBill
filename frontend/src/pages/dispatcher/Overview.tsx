import { Check, CircleAlert, Radar, Snowflake, TriangleAlert, Truck, Workflow } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Chip } from '@/components/domain/chips'
import { PageHeader, Stat } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { closeOrders, planIssues, vehicleFuelLeft } from '@/domain/engine'
import { cn, fmt12 } from '@/lib/utils'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'
import { collectExceptions } from './exceptions'

export function Overview() {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const depot = useDepot()
  const nav = useNavigate()
  const s = world.s

  const orders = s.orders.filter((o) => o.depot === depot && o.status !== 'next_run')
  const confirmed = orders.filter((o) => o.status === 'confirmed')
  const deferred = orders.filter((o) => o.status === 'deferred')
  const planned = orders.filter((o) => o.tripId)
  const vehicles = s.vehicles.filter((v) => v.depot === depot)
  const available = vehicles.filter((v) => v.status === 'available')
  const reefers = available.filter((v) => v.temp === 'reefer')
  const lowFuel = available.filter((v) => vehicleFuelLeft(v) < 30)
  const trips = s.trips.filter((t) => t.depot === depot)
  const exceptions = collectExceptions(world, depot)

  const fresh = planIssues(world)
    .filter((p) => trips.some((t) => t.id === p.tripId && t.brand === 'Fresh'))
    .map((p) => ({ latest: p.metrics.latestDepartMin, depart: p.metrics.departMin }))
    .filter((x) => x.latest !== undefined)
  const tightest = fresh.length ? fresh.reduce((a, b) => (a.latest! - a.depart < b.latest! - b.depart ? a : b)) : undefined

  const anyLoading = trips.some((t) => ['loading', 'ready', 'departed', 'done'].includes(t.status))
  const anyRoad = trips.some((t) => ['departed', 'done'].includes(t.status))
  const allDone = trips.length > 0 && trips.every((t) => t.status === 'done' || t.status === 'stranded')
  const steps = [
    { label: 'Orders closed', done: s.phase !== 'ordering' },
    { label: 'Plan built', done: s.phase !== 'ordering' && confirmed.length === 0 && orders.length > 0 },
    { label: 'Plan published', done: s.phase === 'published' && trips.some((t) => t.status !== 'draft') },
    { label: 'Loading', done: anyLoading },
    { label: 'On the road', done: anyRoad },
    { label: 'All delivered', done: allDone },
  ]
  const current = steps.findIndex((x) => !x.done)

  return (
    <div className="space-y-6">
      <PageHeader title="Today" sub={`${s.dayLabel} · ${depot} depot`} />

      <Card className="overflow-hidden">
        <div className="grid gap-4 bg-accent/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Next step</p>
            {s.phase === 'ordering' && (
              <>
                <p className="text-xl font-bold">Orders are still coming in</p>
                <p className="text-sm text-muted-foreground">{confirmed.length} confirmed so far. They close at 4:00 PM, then you build the plan.</p>
              </>
            )}
            {s.phase === 'planning' && (
              <>
                <p className="text-xl font-bold">
                  {confirmed.length > 0 ? `${confirmed.length} orders need a vehicle or a deferral` : 'Everything is placed. Publish the plan'}
                </p>
                <p className="text-sm text-muted-foreground">Get a suggestion, adjust it, then publish so loaders and drivers can start.</p>
              </>
            )}
            {s.phase === 'published' && (
              <>
                <p className="text-xl font-bold">{exceptions.filter((e) => e.severity !== 'info').length > 0 ? 'Some things need your attention' : 'The plan is out. Watch the runs'}</p>
                <p className="text-sm text-muted-foreground">Loaders and drivers are working from version-tracked trips.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.phase === 'ordering' && (
              <Button
                size="lg"
                onClick={() => {
                  if (window.confirm('Close orders now? Real orders close automatically at 4:00 PM.')) {
                    act((w) => closeOrders(w))
                    toast.success('Orders closed. Time to plan.')
                  }
                }}
              >
                Close orders now
              </Button>
            )}
            {s.phase === 'planning' && (
              <Button size="lg" onClick={() => nav('/dispatcher/planning')}>
                <Workflow /> Open planning board
              </Button>
            )}
            {s.phase === 'published' && (
              <Button size="lg" onClick={() => nav('/dispatcher/runs')}>
                <Radar /> Open live runs
              </Button>
            )}
          </div>
        </div>
        <ol className="grid grid-cols-2 gap-2 border-t p-4 sm:grid-cols-3 lg:grid-cols-6">
          {steps.map((st, i) => (
            <li key={st.label} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold',
                  st.done && 'border-secondary bg-secondary text-secondary-foreground',
                  !st.done && i === current && 'border-primary text-primary ring-4 ring-primary/20',
                  !st.done && i !== current && 'border-input text-muted-foreground',
                )}
              >
                {st.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn(st.done && 'text-muted-foreground', i === current && 'font-semibold')}>{st.label}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Orders today" value={orders.length} sub={`${confirmed.length} not placed yet`} />
        <Stat label="On a trip" value={planned.length} sub={`${trips.length} trips`} />
        <Stat label="Deferred" value={deferred.length} tone={deferred.length ? 'deferred' : undefined} sub="moved to the next run" />
        <Stat label="Vehicles available" value={`${available.length}/${vehicles.length}`} icon={<Truck className="size-4" />} sub={`${vehicles.length - available.length} out of service`} />
        <Stat label="Refrigerated" value={reefers.length} icon={<Snowflake className="size-4" />} sub="can carry chilled" tone={reefers.length <= 2 ? 'late' : undefined} />
        <Stat label="Low on fuel" value={lowFuel.length} sub="under 30 L this week" tone={lowFuel.length ? 'late' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <span className="text-sm text-muted-foreground">{exceptions.length}</span>
          </CardHeader>
          <CardBody className="space-y-2">
            {exceptions.length === 0 && <p className="text-sm text-muted-foreground">Nothing is blocked right now.</p>}
            {exceptions.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3">
                {e.severity === 'danger' ? <CircleAlert className="mt-0.5 size-5 shrink-0 text-deferred" /> : <TriangleAlert className="mt-0.5 size-5 shrink-0 text-late" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-muted-foreground">{e.body}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => nav(e.kind === 'plan' ? '/dispatcher/planning' : '/dispatcher/runs')}>
                  Open
                </Button>
              </div>
            ))}
            {exceptions.length > 6 && (
              <Link to="/dispatcher/runs" className="block text-sm underline">
                See all {exceptions.length}
              </Link>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>The Fresh clock</CardTitle>
            <Chip tone="ontime">Stores open at 8:00 AM</Chip>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {tightest ? (
              <>
                <p>
                  The tightest Fresh trip must leave by <strong>{fmt12(tightest.latest!)}</strong>.
                </p>
                <p className="text-muted-foreground">
                  Planned departure is {fmt12(tightest.depart)}, which leaves {Math.round(tightest.latest! - tightest.depart)} minutes of slack. Fresh trips run within a 270-minute budget per vehicle.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Once Fresh trips are planned, the latest safe departure time shows here, worked back from each store's window.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
