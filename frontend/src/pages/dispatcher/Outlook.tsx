import { Chip } from '@/components/domain/chips'
import { PageHeader } from '@/components/domain/misc'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'

// Illustrative numbers only. In the real system this reads the Datathon demand forecast.
const WEEKS = [
  { label: '5 Oct', total: 410, chilled: 150, tag: '' },
  { label: '12 Oct', total: 420, chilled: 154, tag: '' },
  { label: '19 Oct', total: 415, chilled: 152, tag: '' },
  { label: '26 Oct', total: 470, chilled: 176, tag: 'Payday week' },
  { label: '2 Nov', total: 445, chilled: 165, tag: 'Monsoon' },
  { label: '9 Nov', total: 520, chilled: 205, tag: 'Festival ramp' },
  { label: '16 Nov', total: 560, chilled: 228, tag: 'Festival' },
  { label: '23 Nov', total: 455, chilled: 168, tag: 'Monsoon' },
  { label: '30 Nov', total: 480, chilled: 178, tag: 'Payday week' },
  { label: '7 Dec', total: 505, chilled: 190, tag: '' },
]

export function Outlook() {
  const max = Math.max(...WEEKS.map((w) => w.total))
  const base = WEEKS[0].chilled
  return (
    <div className="space-y-5">
      <PageHeader title="Capacity outlook" sub="Ten weeks ahead: how much will need to move, and when to book extra capacity." />
      <p className="rounded-lg border border-late/40 bg-late-bg px-4 py-3 text-sm text-late-fg">Preview with sample numbers. This page will read the demand forecast from the Datathon model.</p>
      <Card>
        <CardHeader>
          <CardTitle>Weekly volume, Peliyagoda (m³)</CardTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-secondary" /> Total</span>
            <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-chilled" /> Chilled part</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex h-56 items-end gap-2 sm:gap-3" role="img" aria-label="Bar chart of forecast weekly volume">
            {WEEKS.map((w) => (
              <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-medium tabular-nums">{w.total}</span>
                <div className="relative w-full overflow-hidden rounded-t-md bg-secondary" style={{ height: `${(w.total / max) * 78}%` }}>
                  <div className="absolute inset-x-0 bottom-0 bg-chilled" style={{ height: `${(w.chilled / w.total) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{w.label}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>What to plan for</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {WEEKS.filter((w) => w.tag).map((w) => {
            const extra = Math.max(0, Math.ceil((w.chilled - base) / 40))
            return (
              <div key={w.label} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="w-14 font-semibold">{w.label}</span>
                <Chip tone={w.tag.startsWith('Festival') ? 'deferred' : w.tag === 'Monsoon' ? 'syncing' : 'late'}>{w.tag}</Chip>
                <span className="text-muted-foreground">
                  {w.total} m³ in total{extra > 0 ? `. Chilled demand is up ${w.chilled - base} m³, so consider ${extra} extra refrigerated trip${extra === 1 ? '' : 's'} a day.` : '.'}
                  {w.tag === 'Monsoon' && ' Allow extra travel time on Kalutara and hill routes.'}
                </span>
              </div>
            )
          })}
        </CardBody>
      </Card>
    </div>
  )
}
