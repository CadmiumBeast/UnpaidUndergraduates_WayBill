import { CircleCheck, GitMerge, RefreshCw, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Chip } from '@/components/domain/chips'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { getOrder, outletName, resolveConflict, syncNow } from '@/domain/engine'
import { clockTime, timeAgo } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function Sync() {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const setOnline = useStore((s) => s.setOnline)
  const d = world.d
  const open = d.conflicts.filter((c) => !c.resolved)
  const done = d.conflicts.filter((c) => c.resolved)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sync</h1>
        <p className="text-sm text-muted-foreground">What is saved on this phone, and what has reached dispatch.</p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {d.online ? <CircleCheck className="size-7 text-served" /> : <WifiOff className="size-7 text-offline" />}
            <div>
              <p className="font-semibold">{d.online ? 'Connected' : 'No signal'}</p>
              <p className="text-sm text-muted-foreground">Last synced {timeAgo(d.lastSyncedAt)} · {Object.keys(d.cache).length} trips saved</p>
            </div>
          </div>
          <Chip tone={d.outbox.length ? 'syncing' : 'served'} icon={d.outbox.length ? RefreshCw : CircleCheck}>{d.outbox.length ? `${d.outbox.length} waiting` : 'All sent'}</Chip>
        </div>
        <Button size="lg" block variant="outline" disabled={!d.online} onClick={() => { act((w) => syncNow(w)); toast.success('Synced') }}>
          <RefreshCw /> Sync now
        </Button>
        {!d.online && (
          <Button size="lg" block variant="ghost" onClick={() => setOnline(true)}>
            Signal is back? Try to reconnect
          </Button>
        )}
      </Card>

      {open.map((c) => {
        const o = getOrder(world, c.orderId)
        return (
          <Card key={c.id} className="space-y-3 border-conflict p-4">
            <div className="flex items-center gap-2 text-conflict-fg">
              <GitMerge className="size-6" />
              <p className="text-lg font-bold">Two changes clash</p>
            </div>
            <p className="font-semibold">{o ? outletName(o) : c.orderId}</p>
            <div className="space-y-2 text-sm">
              <p className="rounded-md bg-muted px-3 py-2">
                <strong>You recorded</strong> at {clockTime(c.item.outcome.at)} while offline: <strong>{c.item.outcome.kind}</strong>
                {c.item.outcome.proof ? ` (proof: ${c.item.outcome.proof === 'code' ? 'store code' : 'photo'})` : ''}.
              </p>
              <p className="rounded-md bg-conflict-bg px-3 py-2 text-conflict-fg">
                <strong>Dispatch changed the plan:</strong> {c.serverNote}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">If you really did hand the goods over, keep your record. Dispatch will be told and can review it.</p>
            <Button size="xl" block variant="success" disabled={!d.online} onClick={() => { act((w) => resolveConflict(w, c.id, 'kept')); toast.success('Your record was kept and sent to dispatch') }}>
              Keep my delivery record
            </Button>
            <Button size="lg" block variant="outline" disabled={!d.online} onClick={() => { act((w) => resolveConflict(w, c.id, 'accepted')); toast('You accepted the dispatcher\'s change') }}>
              Follow the dispatcher's change
            </Button>
          </Card>
        )
      })}

      {d.outbox.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Waiting to send</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {d.outbox.map((i) => {
              const o = i.type === 'outcome' ? getOrder(world, i.orderId) ?? world.d.cache[i.tripId]?.orders.find((x) => x.id === i.orderId) : undefined
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <span>
                    {i.type === 'start_trip' && 'Trip started'}
                    {i.type === 'outcome' && `${o ? outletName(o) : 'Stop'}: ${i.outcome.kind}`}
                    {i.type === 'problem' && `Problem: ${i.text}`}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{clockTime(i.ts)}</span>
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Resolved</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            {done.map((c) => {
              const o = getOrder(world, c.orderId)
              return (
                <p key={c.id}>
                  {o ? outletName(o) : c.orderId}: {c.resolved === 'kept' ? 'you kept your record' : "you followed the dispatcher's change"}
                </p>
              )
            })}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
