import { Search } from 'lucide-react'
import * as React from 'react'
import { BrandTag, OrderStatusChip, TempTag, Chip } from '@/components/domain/chips'
import { EmptyState, PageHeader } from '@/components/domain/misc'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { OUTLET_BY_ID } from '@/domain/reference'
import type { OrderStatus } from '@/domain/types'
import { clockTime } from '@/lib/utils'
import { useDepot } from '@/store/ui'
import { useStore } from '@/store/useStore'

export function Orders() {
  const s = useStore((st) => st.world.s)
  const depot = useDepot()
  const [tab, setTab] = React.useState<'today' | 'next'>('today')
  const [q, setQ] = React.useState('')
  const [brand, setBrand] = React.useState('all')
  const [temp, setTemp] = React.useState('all')
  const [status, setStatus] = React.useState<'all' | OrderStatus>('all')

  const mine = s.orders.filter((o) => o.depot === depot)
  const today = mine.filter((o) => o.status !== 'next_run')
  const next = mine.filter((o) => o.status === 'next_run')
  const base = tab === 'today' ? today : next
  const rows = base.filter((o) => {
    const outlet = OUTLET_BY_ID[o.outletId]
    if (brand !== 'all' && o.brand !== brand) return false
    if (temp !== 'all' && o.temp !== temp) return false
    if (status !== 'all' && o.status !== status) return false
    if (q && !`${o.ref} ${outlet.name} ${o.district}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const totalVol = rows.reduce((a, o) => a + o.volumeM3, 0)
  const chilled = rows.filter((o) => o.temp === 'chilled').length

  return (
    <div className="space-y-5">
      <PageHeader title="Order queue" sub="Every confirmed order in one place, whichever way it was placed." />
      {s.phase === 'ordering' && (
        <p className="rounded-lg border border-ontime/40 bg-ontime-bg px-4 py-3 text-sm text-ontime-fg">
          Orders are still open until 4:00 PM. New orders from store managers appear here straight away.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'today', label: "Today's run", count: today.length },
            { value: 'next', label: 'Next run', count: next.length },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input className="w-56 pl-9" placeholder="Search outlet or order" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-32" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
            <option value="all">All brands</option>
            <option>Fresh</option>
            <option>Style</option>
            <option>Tech</option>
          </Select>
          <Select className="w-36" value={temp} onChange={(e) => setTemp(e.target.value)} aria-label="Temperature">
            <option value="all">All types</option>
            <option value="chilled">Chilled</option>
            <option value="ambient">Ambient</option>
          </Select>
          <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value as 'all' | OrderStatus)} aria-label="Status">
            <option value="all">All statuses</option>
            {['confirmed', 'planned', 'loaded', 'out', 'delivered', 'partial', 'refused', 'failed', 'deferred'].map((x) => (
              <option key={x} value={x}>{x.replace('_', ' ')}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {rows.length} orders · {chilled} chilled · {totalVol.toFixed(0)} m³ in total
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No orders match">{tab === 'next' ? 'Orders placed after the 4 PM cutoff wait here for the following run.' : 'Try clearing a filter.'}</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Order</th>
                <th className="px-3 py-2.5 font-medium">Outlet</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Units</th>
                <th className="px-3 py-2.5 text-right font-medium">Weight</th>
                <th className="px-3 py-2.5 text-right font-medium">Volume</th>
                <th className="px-3 py-2.5 font-medium">Flags</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const outlet = OUTLET_BY_ID[o.outletId]
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{o.ref}</div>
                      <div className="text-xs text-muted-foreground">{clockTime(o.placedAt)}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{outlet.name.replace('Waypoint ', '')}</div>
                      <div className="text-xs text-muted-foreground">{o.district}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <BrandTag brand={o.brand} />
                        <TempTag temp={o.temp} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{o.units}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{o.weightKg.toLocaleString()} kg</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{o.volumeM3} m³</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {o.deferredYesterday && <Chip tone="deferred">Skipped yesterday</Chip>}
                        {outlet.parking === 'van_only' && <Chip tone="late">Van only</Chip>}
                        {outlet.mallWindow && <Chip tone="late">Mall window</Chip>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <OrderStatusChip status={o.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
