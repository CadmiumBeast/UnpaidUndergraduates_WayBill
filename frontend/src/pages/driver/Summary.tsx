import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Chip, OrderStatusChip, Stamp } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { outletName } from '@/domain/engine'
import { tripFuelL } from '@/domain/rules'
import { useStore } from '@/store/useStore'
import { driverTrips } from './shared'

export function Summary() {
  const { tripId = '' } = useParams()
  const nav = useNavigate()
  const world = useStore((s) => s.world)
  const session = useStore((s) => s.session)!
  const entry = world.d.cache[tripId]
  if (!entry) return <EmptyState title="Trip not on this phone" />
  const { trip, orders } = entry
  const vehicle = world.s.vehicles.find((v) => v.id === trip.vehicleId)!
  const delivered = orders.filter((o) => o.status === 'delivered').length
  const partial = orders.filter((o) => o.status === 'partial').length
  const bad = orders.filter((o) => o.status === 'failed' || o.status === 'refused').length
  const offline = orders.filter((o) => o.outcome?.recordedOffline).length
  const nextTrip = driverTrips(world, session.vehicleId!).find((c) => c.trip.tripNo > trip.tripNo && c.trip.status !== 'done')

  return (
    <div className="space-y-4">
      <Link to="/driver" className="inline-flex h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft className="size-5" /> Trips
      </Link>
      <div className="space-y-2 text-center">
        <Stamp tone={bad ? 'late' : 'served'}>Trip {trip.tripNo} {bad ? 'finished with issues' : 'complete'}</Stamp>
        <p className="text-muted-foreground">{trip.district} · {orders.length} stops</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3"><p className="font-display text-3xl font-bold text-served">{delivered}</p><p className="text-xs text-muted-foreground">Delivered</p></Card>
        <Card className="p-3"><p className="font-display text-3xl font-bold text-late">{partial}</p><p className="text-xs text-muted-foreground">Part</p></Card>
        <Card className="p-3"><p className="font-display text-3xl font-bold text-deferred">{bad}</p><p className="text-xs text-muted-foreground">Not delivered</p></Card>
      </div>
      <Card className="divide-y">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 truncate font-medium">{outletName(o)}</span>
            <OrderStatusChip status={o.status} />
          </div>
        ))}
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Fuel used on this trip: about {tripFuelL(orders, vehicle).toFixed(0)} L{offline > 0 ? ` · ${offline} record${offline === 1 ? '' : 's'} saved offline` : ''}
      </p>
      {!world.d.online && <Chip tone="offline">Some records are still waiting to send</Chip>}
      {nextTrip ? (
        <Button size="xl" block onClick={() => nav(`/driver/trip/${nextTrip.trip.id}`)}>Go to trip {nextTrip.trip.tripNo}</Button>
      ) : (
        <Button size="xl" block variant="outline" onClick={() => nav('/driver')}>Back to trips</Button>
      )}
    </div>
  )
}
