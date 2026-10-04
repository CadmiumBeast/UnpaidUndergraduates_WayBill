import { RotateCcw } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { BrandTag, Chip } from '@/components/domain/chips'
import { PageHeader } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { outletName, runAutoPlan } from '@/domain/engine'
import { priorityScore } from '@/domain/planner'
import type { Playbook } from '@/domain/types'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'
import { AssignModal, DeferModal } from './parts'

const WEIGHTS: { key: keyof Playbook; label: string; help: string }[] = [
  { key: 'chilled', label: 'Chilled goods first', help: 'Chilled orders spoil. Raise this to protect them when refrigerated capacity is short.' },
  { key: 'skipped', label: 'Skipped yesterday', help: 'Outlets skipped on the previous run move up so nobody waits two days in a row.' },
  { key: 'days', label: 'Days since last served', help: 'The longer an outlet has waited, up to a week, the higher it ranks.' },
  { key: 'fresh', label: 'Fresh brand', help: 'Fresh has the hard 8 AM deadline, so it gets a small boost over Style and Tech.' },
]

export function Deferrals() {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const depot = useDepot()
  const [assign, setAssign] = React.useState<string | null>(null)
  const [defer, setDefer] = React.useState<string | null>(null)
  const s = world.s
  const orders = s.orders.filter((o) => o.depot === depot && o.status !== 'next_run')
  const deferred = orders.filter((o) => o.status === 'deferred')
  const watch = orders.filter((o) => o.deferredYesterday || o.daysSinceLastServed >= 3).sort((a, b) => b.daysSinceLastServed - a.daysSinceLastServed)
  const ranked = [...orders.filter((o) => ['confirmed', 'deferred', 'planned'].includes(o.status))]
    .sort((a, b) => priorityScore(b, s.playbook) - priorityScore(a, s.playbook))
    .slice(0, 8)
  const published = s.phase === 'published'

  const setWeight = (key: keyof Playbook, v: number) =>
    act((w) => {
      w.s.playbook[key] = v
    })

  return (
    <div className="space-y-6">
      <PageHeader title="Deferrals and fairness" sub="When demand beats capacity, decide who waits, and be able to say why." />

      <Card>
        <CardHeader>
          <CardTitle>Deferred today</CardTitle>
          <span className="text-sm text-muted-foreground">{deferred.length}</span>
        </CardHeader>
        <CardBody className="space-y-2">
          {deferred.length === 0 && <p className="text-sm text-muted-foreground">Nothing has been deferred.</p>}
          {deferred.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{outletName(o)}</span>
                  <BrandTag brand={o.brand} />
                  <span className="text-xs text-muted-foreground">{o.ref}</span>
                  {o.deferredYesterday && <Chip tone="deferred">Second skip in a row</Chip>}
                </div>
                <p className="text-sm text-deferred-fg">{o.deferReason}</p>
                <p className="text-xs text-muted-foreground">Last served {o.daysSinceLastServed} days ago</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAssign(o.id)}>Try to fit it in</Button>
                <Button size="sm" variant="ghost" onClick={() => setDefer(o.id)}>Edit reason</Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Priority playbook</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">These weights decide who is served first when the suggestion is built. Nothing is hidden.</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            {WEIGHTS.map((wt) => (
              <div key={wt.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor={`pb-${wt.key}`} className="font-medium">{wt.label}</label>
                  <span className="tabular-nums text-muted-foreground">{s.playbook[wt.key]}</span>
                </div>
                <input
                  id={`pb-${wt.key}`}
                  type="range"
                  min={0}
                  max={60}
                  value={s.playbook[wt.key]}
                  onChange={(e) => setWeight(wt.key, Number(e.target.value))}
                  className="h-2 w-full accent-[var(--primary)]"
                />
                <p className="text-xs text-muted-foreground">{wt.help}</p>
              </div>
            ))}
            <Button
              variant="secondary"
              block
              disabled={published || s.phase === 'ordering'}
              onClick={() => {
                const res = act((w) => runAutoPlan(w, depot))
                toast.success(`New suggestion: ${res.trips.length} trips, ${res.deferred.length} deferred`)
              }}
            >
              <RotateCcw /> Rebuild the suggestion with these weights
            </Button>
            {published && <p className="text-xs text-muted-foreground">The plan is published, so the suggestion can't be rebuilt. Change assignments on the planning board.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who ranks highest right now</CardTitle>
          </CardHeader>
          <CardBody>
            <ol className="space-y-1.5">
              {ranked.map((o, i) => (
                <li key={o.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-right text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{outletName(o)}</span>
                  <span className="text-xs text-muted-foreground">{o.temp === 'chilled' ? 'chilled' : o.brand}</span>
                  <span className="w-10 text-right font-medium tabular-nums">{priorityScore(o, s.playbook).toFixed(0)}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outlets to watch</CardTitle>
          <span className="text-sm text-muted-foreground">Skipped yesterday, or waiting 3 or more days</span>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {watch.length === 0 && <p className="text-sm text-muted-foreground">No outlet is at risk of being skipped again.</p>}
          {watch.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{outletName(o)}</p>
                <p className="text-xs text-muted-foreground">
                  {o.ref} · {o.status === 'deferred' ? 'deferred again' : o.tripId ? 'on a trip today' : 'not placed yet'}
                </p>
              </div>
              <Chip tone={o.status === 'deferred' ? 'deferred' : 'late'}>{o.daysSinceLastServed} days</Chip>
            </div>
          ))}
        </CardBody>
      </Card>

      <AssignModal orderId={assign} onClose={() => setAssign(null)} />
      <DeferModal orderId={defer} onClose={() => setDefer(null)} />
    </div>
  )
}
