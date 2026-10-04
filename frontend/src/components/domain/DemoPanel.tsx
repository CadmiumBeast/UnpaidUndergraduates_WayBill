import { FlaskConical, Flame, Fuel, PackageX, PauseCircle, Truck, WifiOff } from 'lucide-react'
import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ACCOUNTS, ROLE_HOME, ROLE_LABEL } from '@/domain/accounts'
import { breakVehicle, deferOrder, exhaustFuel, flagLoadIssue, getTrip, ordersOfTrip, tripsOfVehicle } from '@/domain/engine'
import { PRESETS } from '@/domain/presets'
import { useStore } from '@/store/useStore'

export function DemoPanel() {
  const [open, setOpen] = React.useState(false)
  const nav = useNavigate()
  const { pathname } = useLocation()
  const bottomNav = pathname.startsWith('/driver') || pathname.startsWith('/loader')
  const act = useStore((s) => s.act)
  const reset = useStore((s) => s.reset)
  const online = useStore((s) => s.world.d.online)
  const login = useStore((s) => s.login)
  const preset = useStore((s) => s.world.s.preset)
  const session = useStore((s) => s.session)
  const setOnline = useStore((s) => s.setOnline)

  const run = (fn: (w: import('@/domain/types').World) => string) => {
    const msg = act(fn)
    toast(msg)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed right-4 z-40 flex h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold text-foreground shadow-lg hover:bg-accent ${bottomNav ? 'bottom-24' : 'bottom-4'}`}
      >
        <FlaskConical className="size-4" /> Demo tools
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Demo tools" size="md">
        <div className="space-y-6 text-sm">
          <p className="text-muted-foreground">
            For judges and testers. Everything here works on mock data only. Open a second browser window to watch two roles at once: dispatcher and driver data stay in sync across windows, while the connection switch below only affects this window.
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold">This window's connection</h3>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="flex items-center gap-2">
                <WifiOff className="size-4" /> Simulate no signal
              </span>
              <Switch checked={!online} onChange={(v) => setOnline(!v)} label="Simulate no signal" />
            </label>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Jump to a starting point</h3>
            <p className="text-xs text-muted-foreground">This resets all data. Current: {PRESETS.find((p) => p.id === preset)?.label ?? preset}.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    reset(p.id)
                    toast.success(`Reset: ${p.label}`)
                    if (session) nav(ROLE_HOME[session.role])
                  }}
                  className="rounded-lg border p-3 text-left hover:bg-accent"
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Trigger a failure</h3>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  run((w) => {
                    const t = tripsOfVehicle(w, 'VEH001').find((x) => x.status === 'departed')
                    if (!t) return "Ruwan's truck isn't on the road yet. Jump to 'Trucks on the road' first."
                    const next = ordersOfTrip(w, t).find((o) => !o.outcome)
                    if (!next) return 'No pending stops left.'
                    deferOrder(w, next.id, 'Outlet asked to reschedule')
                    return `Dispatcher deferred ${next.ref}. Do this while the driver window is offline to see the conflict screen.`
                  })
                }
              >
                <PauseCircle /> Dispatcher defers the driver's next stop
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  run((w) => {
                    const t = tripsOfVehicle(w, 'VEH001').find((x) => x.status === 'departed')
                    if (!t) return "Ruwan's truck isn't on the road yet."
                    breakVehicle(w, 'VEH001')
                    return 'VEH001 broke down. Check the dispatcher live runs page.'
                  })
                }
              >
                <Truck /> Break down the driver's truck (VEH001)
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  run((w) => {
                    exhaustFuel(w, 'VEH003')
                    return 'VEH003 is almost out of weekly fuel. Check the planning board and fleet page.'
                  })
                }
              >
                <Fuel /> Use up the fuel quota on VEH003
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  run((w) => {
                    const trip = w.s.trips.find((t) => ['published', 'loading'].includes(t.status) && ordersOfTrip(w, t).some((o) => o.loadState === 'pending'))
                    if (!trip) return "No trip is waiting to be loaded. Jump to 'Plan published, loading'."
                    const o = ordersOfTrip(w, trip).find((x) => x.loadState === 'pending')!
                    flagLoadIssue(w, o.id, 'damaged', Math.max(2, Math.round(o.units * 0.15)), 'Crates crushed at the dock')
                    const t2 = getTrip(w, trip.id)
                    return `Flagged damaged goods on ${o.ref} (${t2?.vehicleId}). The dispatcher must decide.`
                  })
                }
              >
                <PackageX /> Loader finds damaged goods
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  run(() => {
                    return 'Tip: to test the after-cutoff message, jump to "Orders closed" and place an order as the store manager.'
                  })
                }
              >
                <Flame /> Late order after the cutoff (how to test)
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Sign in quickly as</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  onClick={async () => {
                    const result = await login(a.username, a.pin)
                    if (!result.ok) return
                    setOpen(false)
                    nav(ROLE_HOME[a.role])
                  }}
                  className="rounded-lg border p-3 text-left hover:bg-accent"
                >
                  <span className="block font-medium">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_LABEL[a.role]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </>
  )
}
