import { CalendarClock, ChevronRight, PackageCheck, Plus, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandTag, OrderStatusChip, TempTag } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { etaWindow, getTrip, ordersOfTrip } from '@/domain/engine'
import type { Order, World } from '@/domain/types'
import { cn, fmt12 } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function stopsAway(w: World, o: Order): number | null {
  const t = o.tripId ? getTrip(w, o.tripId) : undefined
  if (!t || t.status !== 'departed') return null
  const pending = ordersOfTrip(w, t).filter((x) => !x.outcome)
  const i = pending.findIndex((x) => x.id === o.id)
  return i < 0 ? null : i
}

export function OrderCard({ o, world }: { o: Order; world: World }) {
  const win = etaWindow(world, o)
  const away = stopsAway(world, o)
  const needsReceipt = (o.status === 'delivered' || o.status === 'partial') && !o.receipt
  return (
    <Link to={`/manager/track/${o.id}`}>
      <Card className={cn('flex items-center gap-3 p-4 hover:bg-accent', needsReceipt && 'border-primary')}>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{o.ref}</span>
            <TempTag temp={o.temp} />
            <OrderStatusChip status={o.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {o.units} units · {o.weightKg.toLocaleString()} kg
            {['planned', 'loaded', 'out'].includes(o.status) && win ? ` · arriving ${fmt12(win.from)} to ${fmt12(win.to)}` : ''}
            {away !== null ? (away === 0 ? ' · you are next' : ` · ${away} stop${away === 1 ? '' : 's'} away`) : ''}
          </p>
          {o.status === 'deferred' && <p className="text-sm font-medium text-deferred-fg">{o.deferReason}</p>}
          {needsReceipt && <p className="text-sm font-semibold text-primary">Tap to confirm what arrived</p>}
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  )
}

export function ManagerHome() {
  const world = useStore((s) => s.world)
  const session = useStore((s) => s.session)!
  const s = world.s
  const mine = s.orders.filter((o) => o.outletId === session.outletId).sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  const today = mine.filter((o) => o.status !== 'next_run')
  const nextRun = mine.filter((o) => o.status === 'next_run')
  const deferred = today.filter((o) => o.status === 'deferred')
  const confirm = today.filter((o) => (o.status === 'delivered' || o.status === 'partial') && !o.receipt)
  const open = s.phase === 'ordering'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Hello, {session.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">{s.dayLabel}</p>
      </div>

      <Card className={cn('flex flex-wrap items-center justify-between gap-3 p-4', open ? 'border-ontime/40 bg-ontime-bg' : 'border-late/40 bg-late-bg')}>
        <div className="flex items-start gap-3">
          <CalendarClock className={cn('mt-0.5 size-6', open ? 'text-ontime-fg' : 'text-late-fg')} />
          <div>
            <p className={cn('font-semibold', open ? 'text-ontime-fg' : 'text-late-fg')}>{open ? 'Orders are open until 4:00 PM' : 'Orders for this run are closed'}</p>
            <p className={cn('text-sm', open ? 'text-ontime-fg/80' : 'text-late-fg/80')}>
              {open ? 'Order now and it goes on tomorrow\'s run. You can change or cancel until 4 PM.' : 'A new order now goes on the following run.'}
            </p>
          </div>
        </div>
        <Link to="/manager/order" className={buttonVariants({ size: 'lg' })}>
          <Plus /> Place an order
        </Link>
      </Card>

      {deferred.map((o) => (
        <Card key={o.id} className="flex items-start gap-3 border-deferred bg-deferred-bg p-4 text-deferred-fg">
          <TriangleAlert className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="font-bold">Your {o.ref} won't arrive today</p>
            <p className="text-sm">{o.deferReason}. It moves to the next run, and we'll keep it high on the list.</p>
          </div>
        </Card>
      ))}

      {confirm.length > 0 && (
        <Card className="flex items-center gap-3 border-primary bg-accent p-4">
          <PackageCheck className="size-6 shrink-0 text-primary" />
          <p className="font-semibold">{confirm.length} delivery {confirm.length === 1 ? 'has' : 'deliveries have'} arrived. Please confirm what you received.</p>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your orders</h2>
        {today.length === 0 && <EmptyState title="No orders yet">Place an order before 4:00 PM to get it on tomorrow's run.</EmptyState>}
        {today.map((o) => <OrderCard key={o.id} o={o} world={world} />)}
      </section>

      {nextRun.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Waiting for the next run</h2>
          {nextRun.map((o) => <OrderCard key={o.id} o={o} world={world} />)}
        </section>
      )}
      <p className="text-xs text-muted-foreground"><BrandTag brand="Fresh" /> outlets can order chilled goods. Style and Tech order once a week.</p>
    </div>
  )
}
