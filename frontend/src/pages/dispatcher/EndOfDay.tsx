import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Chip } from '@/components/domain/chips'
import { PageHeader, Stat } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { outletName } from '@/domain/engine'
import { tripFuelL } from '@/domain/rules'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'

export function EndOfDay() {
  const world = useStore((s) => s.world)
  const depot = useDepot()
  const s = world.s
  const orders = s.orders.filter((o) => o.depot === depot && o.status !== 'next_run')
  const delivered = orders.filter((o) => o.status === 'delivered' || o.status === 'partial')
  const deferred = orders.filter((o) => o.status === 'deferred')
  const notDone = orders.filter((o) => o.status === 'failed' || o.status === 'refused')
  const open = orders.filter((o) => ['confirmed', 'planned', 'loaded', 'out'].includes(o.status))
  const receiptIssues = orders.filter((o) => o.receipt?.issue)
  const loadIssues = orders.filter((o) => o.loadIssue)
  const reasons = new Map<string, number>()
  deferred.forEach((o) => reasons.set(o.deferReason ?? 'No reason recorded', (reasons.get(o.deferReason ?? 'No reason recorded') ?? 0) + 1))
  const brands = ['Fresh', 'Style', 'Tech'] as const
  const trips = s.trips.filter((t) => t.depot === depot && t.status === 'done')
  const fuel = trips.reduce((sum, t) => {
    const v = s.vehicles.find((x) => x.id === t.vehicleId)!
    return sum + tripFuelL(t.orderIds.map((id) => s.orders.find((o) => o.id === id)!).filter(Boolean), v)
  }, 0)

  const summary = [
    `Waypoint ${depot} end of day, ${s.dayLabel}`,
    `Delivered ${delivered.length} of ${orders.length} orders. Deferred ${deferred.length}. Not delivered ${notDone.length}. Still open ${open.length}.`,
    ...[...reasons.entries()].map(([r, n]) => `Deferred (${n}): ${r}`),
    `Receipt issues: ${receiptIssues.length}. Loading shortfalls: ${loadIssues.length}.`,
    `Fuel used by finished trips: ${fuel.toFixed(0)} L.`,
  ].join('\n')

  return (
    <div className="space-y-6">
      <PageHeader
        title="End of day"
        sub="Something you can hand to management: what happened, and why."
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary)
                toast.success('Summary copied')
              } catch {
                toast.error('Could not copy. Select the text instead.')
              }
            }}
          >
            <Copy /> Copy summary
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Delivered" value={delivered.length} sub={`of ${orders.length} orders`} tone="served" />
        <Stat label="Deferred" value={deferred.length} tone={deferred.length ? 'deferred' : undefined} />
        <Stat label="Not delivered" value={notDone.length} tone={notDone.length ? 'late' : undefined} sub="refused or closed" />
        <Stat label="Still open" value={open.length} />
        <Stat label="Fuel used" value={`${fuel.toFixed(0)} L`} sub={`${trips.length} finished trips`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By brand</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {brands.map((b) => {
              const all = orders.filter((o) => o.brand === b)
              const done = all.filter((o) => o.status === 'delivered' || o.status === 'partial').length
              const def = all.filter((o) => o.status === 'deferred').length
              return (
                <div key={b} className="flex items-center gap-3 text-sm">
                  <span className="w-14 font-medium">{b}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="bg-served" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} />
                    <div className="bg-deferred" style={{ width: `${all.length ? (def / all.length) * 100 : 0}%` }} />
                  </div>
                  <span className="w-28 text-right tabular-nums text-muted-foreground">{done} done · {def} deferred</span>
                </div>
              )
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Why orders were deferred</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {reasons.size === 0 && <p className="text-sm text-muted-foreground">No deferrals.</p>}
            {[...reasons.entries()].map(([r, n]) => (
              <div key={r} className="flex items-start gap-3 text-sm">
                <Chip tone="deferred">{n}</Chip>
                <span>{r}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Issues to follow up</CardTitle></CardHeader>
        <CardBody className="space-y-2 text-sm">
          {receiptIssues.length + loadIssues.length + notDone.length === 0 && <p className="text-muted-foreground">No issues recorded.</p>}
          {loadIssues.map((o) => (
            <p key={`l${o.id}`}>Loading: {o.ref} at {outletName(o)}, {o.loadIssue!.units} units {o.loadIssue!.kind}. {o.loadIssue!.resolution ? `Resolved by ${o.loadIssue!.resolution.replace('_', ' ')}.` : 'Not resolved.'}</p>
          ))}
          {notDone.map((o) => (
            <p key={`n${o.id}`}>Delivery: {o.ref} at {outletName(o)} was {o.status}{o.outcome?.reason ? `, ${o.outcome.reason}` : ''}.</p>
          ))}
          {receiptIssues.map((o) => (
            <p key={`r${o.id}`}>Receipt: {outletName(o)} reported {o.receipt!.issue!.kind.replace('_', ' ')} on {o.ref}{o.receipt!.issue!.note ? `, ${o.receipt!.issue!.note}` : ''}.</p>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
