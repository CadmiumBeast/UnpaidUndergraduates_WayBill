import { ArrowLeft, ClipboardCheck, Flag, Hourglass, MapPinned } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandTag, Chip, OrderStatusChip } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { RouteLine, type RouteStep } from '@/components/domain/RouteLine'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ackVersion, driverProblem, outletName } from '@/domain/engine'
import { OUTLET_BY_ID } from '@/domain/reference'
import { clockTime, fmt12, t12 } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { driverEtas } from './shared'

export function TripRoute() {
  const { tripId = '' } = useParams()
  const nav = useNavigate()
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const entry = world.d.cache[tripId]
  if (!entry) return <EmptyState title="Trip not on this phone">Connect to the internet once to download it.</EmptyState>
  const { trip, orders } = entry
  const m = driverEtas(world, trip, orders)
  const pending = orders.filter((o) => !o.outcome)
  const next = pending[0]
  const seen = world.s.seen[`driver:${trip.id}`] ?? 0
  const changes = trip.changes.filter((c) => c.v > seen && c.v > 1)

  const steps: RouteStep[] = orders.map((o) => {
    const outlet = OUTLET_BY_ID[o.outletId]
    const eta = m.etas.find((e) => e.orderId === o.id)
    const bad = o.status === 'failed' || o.status === 'refused'
    return {
      id: o.id,
      state: bad ? 'issue' : o.outcome ? 'done' : o.id === next?.id && trip.status === 'departed' ? 'current' : 'next',
      title: outletName(o),
      sub: o.outcome ? (
        <>
          <OrderStatusChip status={o.status} /> {clockTime(o.outcome.at)}
          {o.outcome.recordedOffline ? ' · saved offline' : ''}
        </>
      ) : (
        `Window ${t12(outlet.mallWindow ? outlet.mallWindow[0] : outlet.windowOpen)} to ${t12(outlet.mallWindow ? outlet.mallWindow[1] : outlet.windowClose)}`
      ),
      aside: !o.outcome && eta ? fmt12(eta.arriveMin) : undefined,
    }
  })

  return (
    <div className="space-y-4">
      <Link to="/driver" className="inline-flex h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft className="size-5" /> Trips
      </Link>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Trip {trip.tripNo}</h1>
          <BrandTag brand={trip.brand} />
        </div>
        <p className="text-muted-foreground">
          {trip.district} · {orders.length} stops · plan v{trip.version}
        </p>
      </div>

      {changes.length > 0 && trip.status !== 'done' && (
        <Card className="space-y-2 border-late bg-late-bg p-4 text-late-fg">
          <p className="font-bold">Your plan changed</p>
          <ul className="list-disc pl-5 text-sm">
            {changes.map((c) => (
              <li key={c.v}>{c.text}</li>
            ))}
          </ul>
          <Button variant="outline" size="lg" block onClick={() => act((w) => ackVersion(w, `driver:${trip.id}`, trip.version))}>
            Got it
          </Button>
        </Card>
      )}

      {(trip.status === 'published' || trip.status === 'loading') && (
        <Card className="flex items-start gap-3 p-4">
          <Hourglass className="mt-0.5 size-6 shrink-0 text-ontime" />
          <div>
            <p className="font-semibold">The loader is still working on this trip</p>
            <p className="text-sm text-muted-foreground">You will be told when it is sealed and ready at the gate.</p>
          </div>
        </Card>
      )}

      {trip.status === 'ready' && (
        <Button size="xl" block onClick={() => nav(`/driver/pretrip/${trip.id}`)}>
          <ClipboardCheck /> Do the pre-trip check
        </Button>
      )}

      {trip.status === 'departed' && next && (
        <Button size="xl" block onClick={() => nav(`/driver/stop/${trip.id}/${next.id}`)}>
          <MapPinned /> Next stop: {outletName(next)}
        </Button>
      )}

      {trip.status === 'done' && (
        <Button size="xl" block variant="success" onClick={() => nav(`/driver/summary/${trip.id}`)}>
          See trip summary
        </Button>
      )}

      <Card className="p-4">
        <RouteLine steps={steps} onSelect={trip.status === 'departed' ? (id) => nav(`/driver/stop/${trip.id}/${id}`) : undefined} />
      </Card>

      {trip.status === 'departed' && (
        <Button
          variant="outline"
          size="lg"
          block
          onClick={() => {
            act((w) => driverProblem(w, trip.id, undefined, 'Driver needs help (general)'))
            toast(world.d.online ? 'Dispatch has been told' : 'Saved. It will reach dispatch when you have signal.')
          }}
        >
          <Flag /> I need dispatch's help
        </Button>
      )}
      {m.latestDepartMin !== undefined && trip.status === 'ready' && (
        <Chip tone="ontime">Leave by {fmt12(m.latestDepartMin)} at the latest</Chip>
      )}
    </div>
  )
}
