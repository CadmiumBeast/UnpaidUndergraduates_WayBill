import { ArrowLeft, KeyRound, TriangleAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { OrderStatusChip, Stamp, TempTag } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { RouteLine, type RouteStep } from '@/components/domain/RouteLine'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { etaWindow, getOrder, getTrip } from '@/domain/engine'
import { OUTLET_BY_ID } from '@/domain/reference'
import { clockTime, fmt12 } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { stopsAway } from './Home'

export function Track() {
  const { orderId = '' } = useParams()
  const world = useStore((s) => s.world)
  const order = getOrder(world, orderId)
  if (!order) return <EmptyState title="We can't find that order" />
  const outlet = OUTLET_BY_ID[order.outletId]
  const win = etaWindow(world, order)
  const away = stopsAway(world, order)
  const trip = order.tripId ? getTrip(world, order.tripId) : undefined
  const st = order.status
  const rank = { next_run: 0, confirmed: 0, planned: 1, loaded: 2, out: 3, delivered: 4, partial: 4, refused: 4, failed: 4, deferred: 0 }[st]
  const steps: RouteStep[] = [
    { id: 'c', title: 'Order confirmed', sub: clockTime(order.placedAt), state: rank >= 0 ? 'done' : 'next' },
    { id: 'p', title: 'Planned onto a vehicle', sub: win && rank >= 1 ? `Expected ${fmt12(win.from)} to ${fmt12(win.to)}` : 'After the 4 PM cutoff', state: rank >= 1 ? 'done' : rank === 0 ? 'current' : 'next' },
    { id: 'l', title: 'Loaded at the depot', state: rank >= 2 ? 'done' : rank === 1 ? 'current' : 'next' },
    { id: 'o', title: 'On the way', sub: away !== null ? (away === 0 ? 'You are the next stop' : `${away} stop${away === 1 ? '' : 's'} before yours`) : undefined, state: rank >= 4 ? 'done' : rank === 3 ? 'current' : 'next' },
    {
      id: 'd',
      title: st === 'delivered' ? 'Delivered' : st === 'partial' ? 'Partly delivered' : st === 'refused' || st === 'failed' ? 'Could not be delivered' : 'Delivered',
      sub: order.outcome ? clockTime(order.outcome.at) : undefined,
      state: st === 'refused' || st === 'failed' ? 'issue' : rank >= 4 ? 'done' : 'next',
    },
    { id: 'r', title: 'You confirm what arrived', state: order.receipt ? 'done' : rank >= 4 ? 'current' : 'next' },
  ]
  const needsReceipt = (st === 'delivered' || st === 'partial') && !order.receipt

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link to="/manager" className="inline-flex h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft className="size-5" /> Home
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{order.ref}</h1>
          <TempTag temp={order.temp} />
          <OrderStatusChip status={st} />
        </div>
        <p className="text-muted-foreground">{outlet.name.replace('Waypoint ', '')} · {order.units} units · {order.weightKg.toLocaleString()} kg</p>
      </div>

      {st === 'deferred' && (
        <Card className="space-y-2 border-deferred bg-deferred-bg p-4 text-deferred-fg">
          <p className="flex items-center gap-2 text-lg font-bold"><TriangleAlert className="size-5" /> This order won't arrive today</p>
          <p>{order.deferReason}</p>
          <p className="text-sm">It moves to the next run, and it is ranked high so you're not skipped twice in a row. If you can't wait, please call your dispatcher.</p>
        </Card>
      )}
      {st === 'next_run' && (
        <Card className="border-late bg-late-bg p-4 text-late-fg">
          <p className="font-bold">Waiting for the next run</p>
          <p className="text-sm">This order arrived after the 4:00 PM cutoff.</p>
        </Card>
      )}

      {['planned', 'loaded', 'out'].includes(st) && win && (
        <Card className="space-y-1 p-5 text-center">
          <p className="text-sm text-muted-foreground">Expected between</p>
          <p className="font-display text-4xl font-bold tabular-nums">{fmt12(win.from)} to {fmt12(win.to)}</p>
          {away !== null && <p className="text-muted-foreground">{away === 0 ? 'You are the next stop' : `${away} stop${away === 1 ? '' : 's'} away`}</p>}
          <p className="text-xs text-muted-foreground">Plan your receiving staff for this window.</p>
        </Card>
      )}

      {order.handoffCode && ['planned', 'loaded', 'out'].includes(st) && (
        <Card className="space-y-2 p-5">
          <p className="flex items-center gap-2 font-semibold"><KeyRound className="size-5" /> Your receiving code</p>
          <p className="font-display text-5xl font-bold tracking-[0.3em] tabular-nums">{order.handoffCode}</p>
          <p className="text-sm text-muted-foreground">Give this to the driver when the goods arrive. It confirms the delivery reached you, even if the phone has no signal.</p>
        </Card>
      )}

      {needsReceipt && (
        <Link to={`/manager/receive/${order.id}`} className={buttonVariants({ size: 'xl', block: true })}>
          Confirm what arrived
        </Link>
      )}
      {order.receipt && (
        <Card className="space-y-2 p-4 text-center">
          <Stamp tone={order.receipt.issue ? 'late' : 'served'}>{order.receipt.issue ? 'Received with an issue' : 'Received'}</Stamp>
          <p className="text-sm text-muted-foreground">
            You confirmed {order.receipt.unitsReceived} units at {clockTime(order.receipt.at)}.
            {order.receipt.issue && ` You reported: ${order.receipt.issue.kind.replace('_', ' ')}${order.receipt.issue.note ? `, ${order.receipt.issue.note}` : ''}. Operations have been told.`}
          </p>
        </Card>
      )}

      {trip && trip.changes.length > 0 && ['planned', 'loaded', 'out'].includes(st) && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Your delivery time may have shifted because the plan was updated. The window above is the latest.</p>
      )}

      <Card className="p-4">
        <RouteLine steps={steps} />
      </Card>
    </div>
  )
}
