import { PageHeader, EmptyState } from '@/components/domain/misc'
import { Card } from '@/components/ui/card'
import { clockTime } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function Activity() {
  const events = useStore((s) => s.world.s.events)
  return (
    <div className="space-y-5">
      <PageHeader title="Activity log" sub="Every decision and change, with who made it. This is the record when someone asks why." />
      {events.length === 0 ? (
        <EmptyState title="Nothing yet">Actions like placing orders, publishing plans and deferrals are recorded here.</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y">
            {events.slice(0, 120).map((e) => (
              <li key={e.id} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{clockTime(e.ts)}</span>
                <span className="w-32 shrink-0 truncate font-medium">{e.actor}</span>
                <span className="min-w-0 flex-1">{e.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
