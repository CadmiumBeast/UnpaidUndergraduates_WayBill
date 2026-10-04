import { ChevronRight, CloudOff, GitMerge, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandTag, Chip } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { Card } from '@/components/ui/card'
import { fmt12 } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { driverEtas, driverTrips } from './shared'

export function DriverTrips() {
  const world = useStore((s) => s.world)
  const session = useStore((s) => s.session)!
  const trips = driverTrips(world, session.vehicleId!)
  const conflicts = world.d.conflicts.filter((c) => !c.resolved)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Today's trips</h1>
        <p className="text-sm text-muted-foreground">{world.s.dayLabel} · a vehicle runs at most two trips a day</p>
      </div>

      {conflicts.length > 0 && (
        <Link to="/driver/sync">
          <Card className="flex items-center gap-3 border-conflict bg-conflict-bg p-4 text-conflict-fg">
            <GitMerge className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{conflicts.length} record{conflicts.length === 1 ? '' : 's'} need your OK</p>
              <p className="text-sm">The plan changed while you were offline. Tap to review.</p>
            </div>
            <ChevronRight className="size-5" />
          </Card>
        </Link>
      )}

      {trips.length === 0 && (
        world.d.online ? (
          <EmptyState icon={<Route className="size-8" />} title="No trips for you yet">
            When the dispatcher publishes the plan, your trips appear here.
          </EmptyState>
        ) : (
          <EmptyState icon={<CloudOff className="size-8" />} title="No trips saved on this phone">
            Connect once to download today's trips. After that they work with no signal.
          </EmptyState>
        )
      )}

      {trips.map(({ trip, orders }) => {
        const m = driverEtas(world, trip, orders)
        const done = orders.filter((o) => o.outcome).length
        const seen = world.s.seen[`driver:${trip.id}`] ?? 0
        const changed = trip.version > seen && trip.version > 1
        const label =
          trip.status === 'done'
            ? { tone: 'served' as const, text: 'Finished' }
            : trip.status === 'departed'
              ? { tone: 'syncing' as const, text: `${done} of ${orders.length} done` }
              : trip.status === 'ready'
                ? { tone: 'served' as const, text: 'Sealed, ready to go' }
                : { tone: 'ontime' as const, text: 'Being loaded' }
        return (
          <Link key={trip.id} to={`/driver/trip/${trip.id}`}>
            <Card className="flex items-center gap-3 p-4 active:bg-accent">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-2xl font-bold">Trip {trip.tripNo}</span>
                  <BrandTag brand={trip.brand} />
                  {changed && <Chip tone="late">Plan changed</Chip>}
                </div>
                <p className="text-muted-foreground">
                  {trip.district} · {orders.length} stops · leave {fmt12(m.departMin)}
                </p>
                <Chip tone={label.tone}>{label.text}</Chip>
              </div>
              <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
