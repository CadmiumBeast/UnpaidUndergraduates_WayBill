import { ArrowLeft, Camera, Check, MapPin, Package, Phone, Snowflake, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Chip, OrderStatusChip, Stamp, TempTag } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { driverOutcome, outletName } from '@/domain/engine'
import { OUTLET_BY_ID } from '@/domain/reference'
import type { Order } from '@/domain/types'
import { cn, fmt12, t12 } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { driverEtas } from './shared'

const DOCK = { rear_dock: 'the rear loading dock', street: 'the curb outside', mall_bay: "the mall's shared loading bay" }

const FAIL_REASONS = [
  { id: 'closed', kind: 'failed' as const, label: 'The outlet is closed', next: 'Dispatch is told and can reschedule the stop.' },
  { id: 'nobody', kind: 'failed' as const, label: 'Nobody is there to receive the goods', next: 'Dispatch is told. Chilled goods are treated as urgent.' },
  { id: 'refused', kind: 'refused' as const, label: 'The store refused the goods', next: 'Dispatch is told, and the goods stay on the truck for return.' },
  { id: 'access', kind: 'failed' as const, label: "I can't reach the outlet (access blocked)", next: 'Dispatch is told and can send a van.' },
  { id: 'damaged', kind: 'failed' as const, label: 'Goods were damaged on the way', next: 'Dispatch is told. Take a photo if you can.' },
]

export function Stop() {
  const { tripId = '', orderId = '' } = useParams()
  const nav = useNavigate()
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const [mode, setMode] = React.useState<'deliver' | 'fail' | null>(null)
  const entry = world.d.cache[tripId]
  const order = entry?.orders.find((o) => o.id === orderId)
  if (!entry || !order) return <EmptyState title="Stop not found">It may have been removed from your trip.</EmptyState>
  const { trip, orders } = entry
  const outlet = OUTLET_BY_ID[order.outletId]
  const idx = orders.findIndex((o) => o.id === order.id)
  const m = driverEtas(world, trip, orders)
  const eta = m.etas.find((e) => e.orderId === order.id)
  const win = outlet.mallWindow ?? [outlet.windowOpen, outlet.windowClose]

  const afterRecord = () => {
    const nextPending = orders.find((o) => o.id !== order.id && !o.outcome)
    nav(nextPending ? `/driver/stop/${trip.id}/${nextPending.id}` : `/driver/summary/${trip.id}`, { replace: true })
  }

  return (
    <div className="space-y-4">
      <Link to={`/driver/trip/${trip.id}`} className="inline-flex h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft className="size-5" /> Route
      </Link>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">Stop {idx + 1} of {orders.length}</p>
        <h1 className="text-3xl font-bold leading-tight">{outletName(order)}</h1>
        <p className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-1 size-4 shrink-0" /> {outlet.address}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a className="flex h-12 items-center justify-center gap-2 rounded-md border bg-card font-medium" href={`tel:${outlet.contact.replace(/\s/g, '')}`}>
          <Phone className="size-5" /> Call store
        </a>
        <a
          className="flex h-12 items-center justify-center gap-2 rounded-md border bg-card font-medium"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outlet.address)}`}
        >
          <MapPin className="size-5" /> Open in maps
        </a>
      </div>

      <Card className="divide-y">
        <Row label="Delivery window" value={`${t12(win[0])} to ${t12(win[1])}`} />
        <Row label="Expected" value={eta ? fmt12(eta.arriveMin) : '-'} />
        <Row label="Unload at" value={DOCK[outlet.dock]} />
        <Row
          label="Cargo"
          value={
            <span className="flex flex-wrap items-center justify-end gap-1.5">
              <Package className="size-4" /> {order.units} units · {order.weightKg.toLocaleString()} kg <TempTag temp={order.temp} />
            </span>
          }
        />
        {outlet.parking === 'van_only' && <Row label="Access" value="Van only. Narrow street" />}
        {outlet.mallWindow && <Row label="Mall access" value="Only inside the mall window" />}
      </Card>

      {order.temp === 'chilled' && (
        <p className="flex items-center gap-2 rounded-lg bg-chilled-bg px-3 py-2 text-sm text-chilled">
          <Snowflake className="size-4 shrink-0" /> Chilled goods. Keep the doors shut until you're at the dock.
        </p>
      )}

      {order.outcome ? (
        <Card className="space-y-3 p-4 text-center">
          <div className="flex justify-center">
            <Stamp tone={order.outcome.kind === 'delivered' ? 'served' : order.outcome.kind === 'partial' ? 'late' : 'deferred'}>
              {order.outcome.kind === 'delivered' ? 'Delivered' : order.outcome.kind === 'partial' ? 'Part delivered' : 'Not delivered'}
            </Stamp>
          </div>
          <OrderStatusChip status={order.status} />
          {order.outcome.recordedOffline && <p className="text-sm text-muted-foreground">Saved on this phone. It sends when you have signal.</p>}
          <Button size="xl" block variant="outline" onClick={afterRecord}>Next</Button>
        </Card>
      ) : trip.status !== 'departed' ? (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">Start the trip first. Then you can record this stop.</p>
      ) : (
        <div className="space-y-3">
          <Button size="xl" variant="success" block onClick={() => setMode('deliver')}>
            <Check /> Delivered
          </Button>
          <Button size="xl" variant="outline" block onClick={() => setMode('fail')}>
            <TriangleAlert /> I couldn't deliver
          </Button>
          <p className="text-center text-xs text-muted-foreground">Use this screen only when the vehicle is safely parked.</p>
        </div>
      )}

      <DeliverModal
        open={mode === 'deliver'}
        order={order}
        onClose={() => setMode(null)}
        onDone={(units, proof) => {
          const partial = units < order.units
          act((w) => driverOutcome(w, trip.id, order.id, { kind: partial ? 'partial' : 'delivered', unitsDelivered: units, proof }))
          setMode(null)
          toast.success(world.d.online ? 'Delivery recorded' : 'Saved on this phone. It will send when you have signal.')
          afterRecord()
        }}
      />
      <FailModal
        open={mode === 'fail'}
        onClose={() => setMode(null)}
        onDone={(kind, reason) => {
          act((w) => driverOutcome(w, trip.id, order.id, { kind, reason }))
          setMode(null)
          toast(world.d.online ? 'Dispatch has been told' : 'Saved. Dispatch is told when you have signal.')
          afterRecord()
        }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function DeliverModal({ open, order, onClose, onDone }: { open: boolean; order: Order; onClose: () => void; onDone: (units: number, proof: 'code' | 'photo') => void }) {
  const [code, setCode] = React.useState('')
  const [photo, setPhoto] = React.useState(false)
  const [units, setUnits] = React.useState(order.units)
  const [err, setErr] = React.useState('')
  React.useEffect(() => {
    if (open) {
      setCode('')
      setPhoto(false)
      setUnits(order.units)
      setErr('')
    }
  }, [open, order.units])
  const codeOk = code.length === 4 && code === order.handoffCode
  const canSubmit = codeOk || photo
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm delivery"
      sheet
      footer={
        <Button
          size="xl"
          block
          variant="success"
          disabled={!canSubmit}
          onClick={() => onDone(units, codeOk ? 'code' : 'photo')}
        >
          <Check /> Confirm delivery
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="Receiving code from the store manager" hint="They see this code in their app. It works with no signal." error={err}>
          <Input
            big
            inputMode="numeric"
            maxLength={4}
            value={code}
            placeholder="4 digits"
            className="text-center font-display text-3xl tracking-[0.4em]"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              setCode(v)
              setErr(v.length === 4 && v !== order.handoffCode ? "That code doesn't match. Ask the manager to check the code on their screen." : '')
            }}
          />
        </Field>
        {codeOk && (
          <p className="flex items-center gap-2 text-served-fg">
            <Check className="size-5" /> Code matches
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button size="lg" block variant={photo ? 'success' : 'outline'} onClick={() => setPhoto(!photo)}>
          <Camera /> {photo ? 'Photo taken as proof' : 'Nobody to give a code? Take a photo instead'}
        </Button>

        <Field label={`Units delivered (ordered ${order.units})`}>
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" className="size-14" aria-label="Fewer units" onClick={() => setUnits((u) => Math.max(0, u - 1))}>-</Button>
            <span className={cn('w-20 text-center font-display text-3xl font-bold tabular-nums', units < order.units && 'text-late-fg')}>{units}</span>
            <Button size="icon" variant="outline" className="size-14" aria-label="More units" onClick={() => setUnits((u) => Math.min(order.units, u + 1))}>+</Button>
          </div>
          {units < order.units && <Chip tone="late">Will be recorded as a part delivery</Chip>}
        </Field>
      </div>
    </Modal>
  )
}

function FailModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (kind: 'failed' | 'refused', reason: string) => void }) {
  const [pick, setPick] = React.useState(FAIL_REASONS[0].id)
  const [note, setNote] = React.useState('')
  React.useEffect(() => {
    if (open) {
      setPick(FAIL_REASONS[0].id)
      setNote('')
    }
  }, [open])
  const r = FAIL_REASONS.find((x) => x.id === pick)!
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="What happened?"
      sheet
      footer={
        <Button size="xl" block variant="danger" onClick={() => onDone(r.kind, note.trim() ? `${r.label}. ${note.trim()}` : r.label)}>
          Record and tell dispatch
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2" role="radiogroup">
          {FAIL_REASONS.map((x) => (
            <label key={x.id} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3', pick === x.id && 'border-primary bg-accent')}>
              <input type="radio" name="fail" className="size-5 accent-[var(--primary)]" checked={pick === x.id} onChange={() => setPick(x.id)} />
              <span className="font-medium">{x.label}</span>
            </label>
          ))}
        </div>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">What happens next: {r.next}</p>
        <Field label="Anything to add? (optional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
