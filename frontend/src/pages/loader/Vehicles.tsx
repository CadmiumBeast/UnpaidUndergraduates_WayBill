import { ChevronRight, Snowflake, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandTag, Chip } from '@/components/domain/chips'
import { EmptyState, PageHeader } from '@/components/domain/misc'
import { Card } from '@/components/ui/card'
import { getVehicle, ordersOfTrip } from '@/domain/engine'
import { planIssues } from '@/domain/engine'
import { fmt12 } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function LoaderVehicles() {
  const world = useStore((s) => s.world)
  const session = useStore((s) => s.session)!
  const trips = world.s.trips
    .filter((t) => t.depot === session.depot && ['published', 'loading', 'ready', 'departed', 'done'].includes(t.status))
    .sort((a, b) => {
      const rank = (s: string) => ({ loading: 0, published: 1, ready: 2, departed: 3, done: 4 })[s] ?? 5
      return rank(a.status) - rank(b.status) || a.vehicleId.localeCompare(b.vehicleId) || a.tripNo - b.tripNo
    })
  const plans = planIssues(world)
  const waiting = trips.filter((t) => ['published', 'loading'].includes(t.status)).length

  return (
    <div className="space-y-5">
      <PageHeader title="Vehicles to load" sub={waiting ? `${waiting} waiting. Chilled trips first.` : 'Nothing waiting at the dock'} />
      {trips.length === 0 && (
        <EmptyState icon={<Truck className="size-8" />} title="No plan yet">
          When the dispatcher publishes the plan, your trips show up here in loading order.
        </EmptyState>
      )}
      <ul className="space-y-3">
        {trips.map((t) => {
          const v = getVehicle(world, t.vehicleId)!
          const orders = ordersOfTrip(world, t)
          const loaded = orders.filter((o) => o.loadState === 'loaded').length
          const issue = orders.some((o) => o.loadState === 'issue')
          const chilled = orders.some((o) => o.temp === 'chilled')
          const seen = world.s.seen[`loader:${t.id}`] ?? 0
          const changed = t.version > seen && t.version > 1
          const p = plans.find((x) => x.tripId === t.id)
          const state =
            t.status === 'done' || t.status === 'departed' ? (
              <Chip tone="offline">Left the depot</Chip>
            ) : t.status === 'ready' ? (
              <Chip tone="served">Sealed {t.seal}</Chip>
            ) : issue ? (
              <Chip tone="deferred">Shortfall flagged</Chip>
            ) : (
              <Chip tone="ontime">{loaded} of {orders.length} loaded</Chip>
            )
          return (
            <li key={t.id}>
              <Link to={`/loader/trip/${t.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-2xl font-bold">{t.vehicleId}</span>
                      <span className="text-muted-foreground">Trip {t.tripNo}</span>
                      <BrandTag brand={t.brand} />
                      {chilled && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-chilled-bg px-1.5 py-0.5 text-xs font-semibold text-chilled">
                          <Snowflake className="size-3.5" /> Chilled
                        </span>
                      )}
                      {changed && <Chip tone="late">Plan changed</Chip>}
                    </div>
                    <p className="text-muted-foreground">
                      {t.district} · {orders.length} stops · {v.driver} · leaves {p ? fmt12(p.metrics.departMin) : ''}
                    </p>
                    {state}
                  </div>
                  <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
