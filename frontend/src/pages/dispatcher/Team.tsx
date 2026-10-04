import { Check, Minus } from 'lucide-react'
import { PageHeader } from '@/components/domain/misc'
import { Card } from '@/components/ui/card'

const COLS = ['Store manager', 'Dispatcher', 'Loader', 'Driver', 'Depot manager', 'Contract driver', 'Viewer']
const ROWS: [string, (boolean | string)[]][] = [
  ['Place or edit an order', ['Own outlet', false, false, false, false, false, false]],
  ['See all orders', [false, true, false, false, true, false, true]],
  ['Plan and allocate', [false, true, false, false, 'Approve', false, false]],
  ['Publish the plan', [false, true, false, false, true, false, false]],
  ['Defer an order with a reason', [false, true, false, false, true, false, false]],
  ['Override a rule (reason required)', [false, true, false, false, true, false, false]],
  ['Confirm loading, flag shortfalls', [false, false, true, false, false, false, false]],
  ['See a run sheet', [false, true, true, 'Own trips', true, 'Assigned only', true]],
  ['Record a delivery', [false, false, false, true, false, true, false]],
  ['Confirm receipt', [true, false, false, false, false, false, false]],
  ['View reports', [false, true, false, false, true, false, true]],
  ['Manage users', [false, false, false, false, true, false, false]],
]

export function Team() {
  return (
    <div className="space-y-5">
      <PageHeader title="Users and roles" sub="Who can do what. Design preview: the four core roles work today; the last three columns show how external and oversight roles would fit." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Action</th>
              {COLS.map((c, i) => (
                <th key={c} className={`px-3 py-2.5 text-center font-medium ${i >= 4 ? 'text-muted-foreground/70' : ''}`}>{c}{i >= 4 && <div className="text-[10px] normal-case">optional</div>}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, vals]) => (
              <tr key={label} className="border-b last:border-0">
                <td className="px-3 py-2.5 font-medium">{label}</td>
                {vals.map((v, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    {v === true ? <Check className="mx-auto size-4 text-served" aria-label="Allowed" /> : v === false ? <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not allowed" /> : <span className="text-xs text-muted-foreground">{v}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Store managers only ever see their own outlet. Loaders and dispatchers work within their depot. Drivers see only their own trips.</li>
        <li>A contract driver from a partner company would see only the trips assigned to them, and nothing else.</li>
        <li>Overriding a rule always asks for a reason and is recorded in the activity log.</li>
      </ul>
    </div>
  )
}
