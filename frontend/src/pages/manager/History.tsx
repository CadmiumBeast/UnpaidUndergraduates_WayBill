import { EmptyState, PageHeader } from '@/components/domain/misc'
import { useStore } from '@/store/useStore'
import { OrderCard } from './Home'

export function History() {
  const world = useStore((s) => s.world)
  const session = useStore((s) => s.session)!
  const mine = world.s.orders.filter((o) => o.outletId === session.outletId).sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  return (
    <div className="space-y-4">
      <PageHeader title="Order history" sub="Your orders and what happened to each. Tap one for its full timeline." />
      {mine.length === 0 ? <EmptyState title="No orders yet" /> : <div className="space-y-2">{mine.map((o) => <OrderCard key={o.id} o={o} world={world} />)}</div>}
    </div>
  )
}
