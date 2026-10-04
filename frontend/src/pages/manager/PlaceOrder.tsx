import { CircleCheck, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { TempTag } from '@/components/domain/chips'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { amendOrder, cancelOrder, placeOrder } from '@/domain/engine'
import { OUTLET_BY_ID } from '@/domain/reference'
import { estimateSize } from '@/domain/seed'
import type { Order, Temp } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function PlaceOrder() {
  const session = useStore((s) => s.session)!
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const outlet = OUTLET_BY_ID[session.outletId!]
  const open = world.s.phase === 'ordering'
  const [temp, setTemp] = React.useState<Temp>('ambient')
  const [units, setUnits] = React.useState(40)
  const [placed, setPlaced] = React.useState<Order | null>(null)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [editUnits, setEditUnits] = React.useState(0)
  const size = estimateSize(outlet.brand, temp, units)
  const mine = world.s.orders.filter((o) => o.outletId === outlet.id && o.status === 'confirmed')
  const canChill = outlet.brand === 'Fresh'
  const bad = units < 1 || units > 200

  if (placed) {
    const late = placed.status === 'next_run'
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <CircleCheck className="mx-auto size-16 text-served" />
        <h1 className="text-3xl font-bold">{late ? 'Order received for the next run' : 'Order confirmed'}</h1>
        <Card className="space-y-1 p-5">
          <p className="text-sm text-muted-foreground">Your reference</p>
          <p className="font-display text-3xl font-bold tabular-nums">{placed.ref}</p>
          <p className="flex items-center justify-center gap-2 pt-1 text-sm">
            <TempTag temp={placed.temp} /> {placed.units} units · about {placed.weightKg.toLocaleString()} kg
          </p>
        </Card>
        <p className="text-muted-foreground">
          {late
            ? 'It arrived after the 4:00 PM cutoff, so it goes on the following run. We will tell you when it is planned.'
            : "It is in tomorrow's queue. We'll tell you the arrival window as soon as the plan is published, and you can change it until 4:00 PM."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/manager" className={buttonVariants({ size: 'lg' })}>Back to home</Link>
          <Button size="lg" variant="outline" onClick={() => setPlaced(null)}>Place another</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Place an order</h1>
        <p className="text-muted-foreground">
          {open ? `For ${world.s.dayLabel}. Open until 4:00 PM.` : 'Orders for this run are closed. This one will go on the following run.'}
        </p>
      </div>
      {!open && (
        <p className="rounded-lg border border-late/40 bg-late-bg px-4 py-3 text-sm text-late-fg">The 4:00 PM cutoff has passed. You can still order, and it will be planned for the next run.</p>
      )}

      <Card className="space-y-5 p-5">
        <Field label="What are you ordering?">
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(['ambient', 'chilled'] as Temp[]).map((t) => {
              const disabled = t === 'chilled' && !canChill
              return (
                <label key={t} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3', temp === t && 'border-primary bg-accent', disabled && 'cursor-not-allowed opacity-50')}>
                  <input type="radio" name="temp" className="size-5 accent-[var(--primary)]" disabled={disabled} checked={temp === t} onChange={() => setTemp(t)} />
                  <span className="font-medium">{t === 'ambient' ? 'Ambient (dry goods)' : 'Chilled and frozen'}</span>
                </label>
              )
            })}
          </div>
          {!canChill && <span className="block text-xs text-muted-foreground">Only Fresh outlets order chilled goods.</span>}
        </Field>
        <Field label="How many units (cases or items)?" error={bad ? 'Enter a number from 1 to 200.' : undefined}>
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" aria-label="Fewer" onClick={() => setUnits((u) => Math.max(1, u - 5))}><Minus /></Button>
            <Input big inputMode="numeric" value={units} onChange={(e) => setUnits(Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-28 text-center font-display text-2xl font-bold" />
            <Button size="icon" variant="outline" aria-label="More" onClick={() => setUnits((u) => Math.min(200, u + 5))}><Plus /></Button>
          </div>
        </Field>
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Estimated size: about <strong>{size.weightKg.toLocaleString()} kg</strong> and <strong>{size.volumeM3} m³</strong>. This helps us pick the right vehicle.
        </p>
        <Button
          size="xl"
          block
          disabled={bad}
          requiresOnline
          onClick={() => {
            const o = act((w) => placeOrder(w, outlet.id, temp, units))
            setPlaced(o)
            toast.success('Order sent')
          }}
        >
          Place order
        </Button>
      </Card>

      {open && mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Change or cancel before 4:00 PM</h2>
          {mine.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.ref} <TempTag temp={o.temp} className="ml-1" /></p>
                {editing === o.id ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Input aria-label="Units" inputMode="numeric" className="w-24" value={editUnits} onChange={(e) => setEditUnits(Number(e.target.value.replace(/\D/g, '')) || 0)} />
                    <Button size="sm" onClick={() => { if (act((w) => amendOrder(w, o.id, editUnits))) toast.success('Order updated'); setEditing(null) }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{o.units} units · {o.weightKg.toLocaleString()} kg</p>
                )}
              </div>
              {editing !== o.id && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(o.id); setEditUnits(o.units) }}><Pencil /> Change</Button>
                  <Button size="sm" variant="ghost" className="text-deferred-fg" onClick={() => { if (window.confirm(`Cancel ${o.ref}?`)) { act((w) => cancelOrder(w, o.id)); toast(`${o.ref} cancelled`) } }}><Trash2 /> Cancel</Button>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}
