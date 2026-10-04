import { ArrowLeft, Fuel, Lock, Snowflake, Thermometer } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { driverStartTrip, vehicleFuelLeft } from '@/domain/engine'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={cn('flex min-h-16 cursor-pointer items-center gap-4 rounded-lg border p-4', checked && 'border-served bg-served-bg/40')}>
      <input type="checkbox" className="size-7 shrink-0 accent-[var(--served)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex-1">{children}</span>
    </label>
  )
}

export function PreTrip() {
  const { tripId = '' } = useParams()
  const nav = useNavigate()
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const entry = world.d.cache[tripId]
  const [sealOk, setSealOk] = React.useState(false)
  const [fuelOk, setFuelOk] = React.useState(false)
  const [fridgeOk, setFridgeOk] = React.useState(false)
  const [temp, setTemp] = React.useState('3.4')
  if (!entry) return <EmptyState title="Trip not on this phone" />
  const { trip, orders } = entry
  const vehicle = world.s.vehicles.find((v) => v.id === trip.vehicleId)!
  const chilled = orders.some((o) => o.temp === 'chilled')
  const t = Number(temp)
  const tempBad = chilled && (Number.isNaN(t) || t > 5)
  const ready = sealOk && fuelOk && (!chilled || (fridgeOk && !tempBad))
  const left = vehicleFuelLeft(vehicle)

  return (
    <div className="space-y-4">
      <Link to={`/driver/trip/${trip.id}`} className="inline-flex h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft className="size-5" /> Back
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Before you go</h1>
        <p className="text-muted-foreground">Three quick checks. This works with no signal.</p>
      </div>

      <Check checked={sealOk} onChange={setSealOk}>
        <span className="flex items-center gap-2 font-semibold"><Lock className="size-5" /> The seal matches</span>
        <span className="block text-sm text-muted-foreground">The loader wrote seal <strong className="text-foreground">{trip.seal}</strong>. Check the one on the door.</span>
      </Check>

      <Check checked={fuelOk} onChange={setFuelOk}>
        <span className="flex items-center gap-2 font-semibold"><Fuel className="size-5" /> Fuel is enough</span>
        <span className="block text-sm text-muted-foreground">
          Weekly quota left: {left.toFixed(0)} L. If you're short, tell dispatch before you leave.
        </span>
      </Check>

      {chilled && (
        <Card className="space-y-3 p-4">
          <Check checked={fridgeOk} onChange={setFridgeOk}>
            <span className="flex items-center gap-2 font-semibold"><Snowflake className="size-5" /> The fridge unit is running</span>
          </Check>
          <Field
            label="Temperature on the display (°C)"
            hint="Chilled goods must be at 5 °C or below."
            error={tempBad ? 'Too warm. Chilled goods must not leave above 5 °C. Tell dispatch.' : undefined}
          >
            <div className="flex items-center gap-2">
              <Thermometer className="size-6 text-chilled" />
              <Input big inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} className="w-32" />
            </div>
          </Field>
        </Card>
      )}

      <Button
        size="xl"
        block
        disabled={!ready}
        onClick={() => {
          act((w) => driverStartTrip(w, trip.id, { fuelOk, sealOk, fridgeC: chilled ? t : undefined }))
          nav(`/driver/trip/${trip.id}`)
        }}
      >
        Start trip
      </Button>
    </div>
  )
}
