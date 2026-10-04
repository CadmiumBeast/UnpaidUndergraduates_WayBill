import { Bell, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { markRead } from '@/domain/engine'
import { noticesFor } from '@/lib/access'
import { cn, timeAgo } from '@/lib/utils'
import { useStore } from '@/store/useStore'

const ICON = { info: Info, warning: TriangleAlert, success: CircleCheck, danger: CircleAlert }
const TONE = {
  info: 'text-ontime',
  warning: 'text-late',
  success: 'text-served',
  danger: 'text-deferred',
}

export function Notices() {
  const s = useStore((st) => st.world.s)
  const session = useStore((st) => st.session)!
  const act = useStore((st) => st.act)
  const list = noticesFor(s, session)
  const unread = list.filter((n) => !n.read)
  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        sub={unread.length ? `${unread.length} unread` : 'You are all caught up'}
        actions={
          unread.length > 0 && (
            <Button variant="outline" onClick={() => act((w) => markRead(w, unread.map((n) => n.id)))}>
              Mark all as read
            </Button>
          )
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" />} title="Nothing yet">
          Updates about plans, changes and deliveries will show up here.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {list.slice(0, 60).map((n) => {
            const Icon = ICON[n.kind]
            return (
              <li key={n.id}>
                <Card className={cn('flex gap-3 p-3', !n.read && 'border-primary/50')}>
                  <Icon className={cn('mt-0.5 size-5 shrink-0', TONE[n.kind])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{n.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.ts)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
