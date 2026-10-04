import { ArrowLeft, Camera, Check, Flag, Lock, Snowflake, Undo2 } from 'lucide-react'
import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandTag, Chip, TempTag } from '@/components/domain/chips'
import { EmptyState } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ackVersion, confirmReady, flagLoadIssue, getTrip, getVehicle, markLoaded, ordersOfTrip, outletName, startLoading } from '@/domain/engine'
import { OUTLET_BY_ID } from '@/domain/reference'
import type { Order } from '@/domain/types'
import { clockTime } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export function TripLoad() {
  const { tripId = '' } = useParams()
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const [flag, setFlag] = React.useState<Order | null>(null)
  const [seal, setSeal] = React.useState('')
  const trip = getTrip(world, tripId)

  if (!trip) return <EmptyState title="That trip isn't here">It may have been removed. Go back to the vehicle list.</EmptyState>
  const vehicle = getVehicle(world, trip.vehicleId)!
  const orders = ordersOfTrip(world, trip)
  // load the last stop first, so the first stop is at the tailgate
  const loadOrder = [...orders].reverse()
  const loaded = orders.filter((o) => o.loadState === 'loaded').length
  const openIssue = orders.some((o) => o.loadState === 'issue')
  const allLoaded = loaded === orders.length && orders.length > 0
  const departed = ['departed', 'done'].includes(trip.status)
  const sealed = trip.status === 'ready'
  const seen = world.s.seen[`loader:${trip.id}`] ?? 0
  const changes = trip.changes.filter((c) => c.v > seen && c.v > 1)
  const suggestedSeal = `SL-${trip.id.slice(-3)}`

  return (
    <div className="space-y-4">
      <Link to="/loader" className="inline-flex h-11 items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-5" /> All vehicles
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold">{trip.vehicleId}</h1>
        <span className="text-xl text-muted-foreground">Trip {trip.tripNo}</span>
        <BrandTag brand={trip.brand} />
        {vehicle.temp === 'reefer' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-chilled-bg px-2 py-1 text-sm font-semibold text-chilled">
            <Snowflake className="size-4" /> Refrigerated
          </span>
        )}
      </div>
      <p className="text-muted-foreground">
        {trip.district} · {vehicle.driver} · plan v{trip.version}
      </p>

      {changes.length > 0 && !departed && (
        <Card className="border-late bg-late-bg p-4 text-late-fg">
          <p className="text-lg font-bold">The plan changed</p>
          <ul className="mt-1 list-disc pl-5">
            {changes.map((c) => (
              <li key={c.v}>{c.text} <span className="opacity-80">({clockTime(c.at)})</span></li>
            ))}
          </ul>
          <Button className="mt-3" size="lg" variant="outline" onClick={() => act((w) => ackVersion(w, `loader:${trip.id}`, trip.version))}>
            Got it
          </Button>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">Loading order</p>
            <p className="text-sm text-muted-foreground">Last stop goes on first, so stop 1 comes off first at the back.</p>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums">{loaded}/{orders.length}</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-served transition-all" style={{ width: `${orders.length ? (loaded / orders.length) * 100 : 0}%` }} />
        </div>
      </Card>

      {trip.status === 'published' && (
        <Button size="xl" block onClick={() => act((w) => startLoading(w, trip.id))}>Start loading</Button>
      )}

      <ul className="space-y-3">
        {loadOrder.map((o) => {
          const stopNo = orders.findIndex((x) => x.id === o.id) + 1
          const outlet = OUTLET_BY_ID[o.outletId]
          const isLoaded = o.loadState === 'loaded'
          const isIssue = o.loadState === 'issue'
          return (
            <li key={o.id}>
              <Card className={`p-4 ${isLoaded ? 'border-served/50' : ''} ${isIssue ? 'border-deferred' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-secondary bg-card font-display text-2xl font-bold">{stopNo}</div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-semibold">{outletName(o)}</p>
                      <TempTag temp={o.temp} />
                    </div>
                    <p className="text-muted-foreground">
                      {o.ref} · {o.units} units · {o.weightKg.toLocaleString()} kg · {o.volumeM3} m³
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unloads at {outlet.dock === 'rear_dock' ? 'the rear dock' : outlet.dock === 'street' ? 'the curb' : 'the shared mall bay'}
                      {outlet.parking === 'van_only' ? ' · van only' : ''}
                    </p>
                    {isIssue && o.loadIssue && (
                      <p className="rounded-md bg-deferred-bg px-3 py-2 text-deferred-fg">
                        {o.loadIssue.units} units {o.loadIssue.kind} flagged. Waiting for the dispatcher to decide.
                      </p>
                    )}
                    {o.loadIssue?.resolution && !isIssue && <Chip tone="ontime">Dispatcher decided: {o.loadIssue.resolution.replace('_', ' ')}</Chip>}
                  </div>
                </div>
                {!departed && !sealed && trip.status !== 'published' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isLoaded ? (
                      <Button size="lg" variant="outline" onClick={() => act((w) => markLoaded(w, o.id, false))}>
                        <Undo2 /> Undo
                      </Button>
                    ) : (
                      <Button size="xl" variant="success" disabled={isIssue} onClick={() => act((w) => markLoaded(w, o.id, true))} className="flex-1">
                        <Check /> Loaded and secured
                      </Button>
                    )}
                    {!isLoaded && !isIssue && (
                      <Button size="xl" variant="outline" onClick={() => setFlag(o)}>
                        <Flag /> Flag a problem
                      </Button>
                    )}
                    {isLoaded && <Chip tone="served">Loaded</Chip>}
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>

      {!departed && (
        <Card className="space-y-3 p-4">
          <p className="text-lg font-semibold">Gate handoff</p>
          {sealed ? (
            <p className="flex items-center gap-2 text-served-fg">
              <Lock className="size-5" /> Sealed with {trip.seal}. The driver has been told.
            </p>
          ) : (
            <>
              <Field label="Seal number" hint="Written on the seal. The driver checks it matches.">
                <Input big value={seal} onChange={(e) => setSeal(e.target.value)} placeholder={suggestedSeal} />
              </Field>
              <Button
                size="xl"
                block
                disabled={!allLoaded || openIssue}
                onClick={() => {
                  const res = act((w) => confirmReady(w, trip.id, seal.trim() || suggestedSeal))
                  if (res.ok) toast.success('Vehicle sealed and ready for the driver')
                  else toast.error(res.reason)
                }}
              >
                <Lock /> Seal and mark ready
              </Button>
              {!allLoaded && <p className="text-sm text-muted-foreground">Every order must be loaded, or its problem decided by the dispatcher, before you can seal.</p>}
            </>
          )}
        </Card>
      )}

      <FlagModal order={flag} onClose={() => setFlag(null)} />
    </div>
  )
}

function FlagModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const act = useStore((s) => s.act)
  const [kind, setKind] = React.useState<'missing' | 'damaged'>('missing')
  const [units, setUnits] = React.useState(1)
  const [note, setNote] = React.useState('')
  const [photo, setPhoto] = React.useState(false)
  React.useEffect(() => {
    setKind('missing')
    setUnits(1)
    setNote('')
    setPhoto(false)
  }, [order?.id])
  if (!order) return null
  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title="Flag a problem"
      sheet
      footer={
        <>
          <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              act((w) => flagLoadIssue(w, order.id, kind, Math.min(units, order.units), note.trim()))
              toast.error('Sent to the dispatcher. This vehicle waits for their decision.')
              onClose()
            }}
          >
            Send to dispatcher
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">{outletName(order)} · {order.ref} · {order.units} units</p>
        <Field label="What is wrong?">
          <Select className="h-14 text-lg" value={kind} onChange={(e) => setKind(e.target.value as 'missing' | 'damaged')}>
            <option value="missing">Items are missing</option>
            <option value="damaged">Items are damaged</option>
          </Select>
        </Field>
        <Field label="How many units?">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" className="size-14" aria-label="Fewer" onClick={() => setUnits((u) => Math.max(1, u - 1))}>-</Button>
            <span className="w-16 text-center font-display text-3xl font-bold tabular-nums">{units}</span>
            <Button size="icon" variant="outline" className="size-14" aria-label="More" onClick={() => setUnits((u) => Math.min(order.units, u + 1))}>+</Button>
          </div>
        </Field>
        <Field label="Note (optional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: crates crushed at the dock" />
        </Field>
        <Button variant={photo ? 'success' : 'outline'} size="lg" block onClick={() => setPhoto(!photo)}>
          <Camera /> {photo ? 'Photo attached' : 'Add a photo'}
        </Button>
      </div>
    </Modal>
  )
}
