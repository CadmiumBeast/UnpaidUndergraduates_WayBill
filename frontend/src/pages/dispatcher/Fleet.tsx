import { Fuel, Info } from 'lucide-react'
import { Chip, TempTag } from '@/components/domain/chips'
import { PageHeader } from '@/components/domain/misc'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { planIssues, setVehicleStatus, vehicleFuelLeft } from '@/domain/engine'
import type { VehicleStatus } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'

export function Fleet() {
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const depot = useDepot()
  const vehicles = world.s.vehicles.filter((v) => v.depot === depot)
  const plans = planIssues(world)

  return (
    <div className="space-y-5">
      <PageHeader title="Fleet and fuel" sub={`${depot} depot · ${vehicles.filter((v) => v.status === 'available').length} of ${vehicles.length} vehicles available`} />
      <p className="flex items-start gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Every vehicle has a weekly fuel quota, and route distance uses it up. Under the QR fuel pass system the quota resets each Sunday and does not roll over, so a vehicle
          that runs dry mid-week drops out of the fleet. Quotas below are demo values.
        </span>
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Vehicle</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Capacity</th>
              <th className="px-3 py-2.5 font-medium">Driver</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Weekly fuel</th>
              <th className="px-3 py-2.5 text-right font-medium">Planned today</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const left = vehicleFuelLeft(v)
              const pct = Math.min(100, (v.usedL / v.weeklyQuotaL) * 100)
              const planned = Math.max(0, ...plans.filter((p) => p.vehicleId === v.id).map((p) => p.metrics.fuelPlannedL))
              const short = planned > left + 1e-9
              return (
                <tr key={v.id} className={cn('border-b last:border-0', v.status !== 'available' && 'bg-muted/40 text-muted-foreground')}>
                  <td className="px-3 py-2.5 font-semibold">{v.id}<div className="text-xs font-normal text-muted-foreground">{v.plate}</div></td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{v.type === 'van' ? 'Van' : 'Truck'}</span>
                      <TempTag temp={v.temp === 'reefer' ? 'chilled' : 'ambient'} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{v.weightCap.toLocaleString()} kg · {v.volumeCap} m³</td>
                  <td className="px-3 py-2.5">{v.driver}</td>
                  <td className="px-3 py-2.5">
                    {v.status === 'broken_down' ? (
                      <Chip tone="deferred">Broken down</Chip>
                    ) : (
                      <Select
                        className="h-9 w-36"
                        value={v.status}
                        aria-label={`Status of ${v.id}`}
                        onChange={(e) => act((w) => setVehicleStatus(w, v.id, e.target.value as VehicleStatus))}
                      >
                        <option value="available">Available</option>
                        <option value="in_workshop">In workshop</option>
                      </Select>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="w-44 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1"><Fuel className="size-3.5" /> {left.toFixed(0)} L left</span>
                        <span className="text-muted-foreground">of {v.weeklyQuotaL}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full', left < 30 ? 'bg-deferred' : left < 70 ? 'bg-late' : 'bg-served')} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums', short && 'font-semibold text-deferred-fg')}>
                    {planned > 0 ? `${planned.toFixed(0)} L` : '-'}
                    {short && <div className="text-xs">Not enough fuel</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
