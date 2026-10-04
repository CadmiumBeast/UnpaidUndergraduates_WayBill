import { ArrowLeft, Camera, Check } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/domain/misc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/input'
import { confirmReceipt, getOrder } from '@/domain/engine'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

type IssueKind = 'none' | 'missing' | 'damaged' | 'wrong_item'
const ISSUES: { v: IssueKind; label: string }[] = [
  { v: 'none', label: 'Everything is fine' },
  { v: 'missing', label: 'Some items are missing' },
  { v: 'damaged', label: 'Some items are damaged' },
  { v: 'wrong_item', label: 'I received the wrong items' },
]

export function Receive() {
  const { orderId = '' } = useParams()
  const nav = useNavigate()
  const world = useStore((s) => s.world)
  const act = useStore((s) => s.act)
  const order = getOrder(world, orderId)
  const expected = order ? (order.outcome?.unitsDelivered ?? order.units) : 0
  const [units, setUnits] = React.useState(expected)
  const [issue, setIssue] = React.useState<IssueKind>('none')
  const [note, setNote] = React.useState('')
  const [photo, setPhoto] = React.useState(false)
  React.useEffect(() => setUnits(expected), [expected])
  if (!order) return <EmptyState title="We can't find that order" />
  const short = units < expected
  const needsNote = issue !== 'none' && !note.trim() && !short

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link to={`/manager/track/${order.id}`} className="inline-flex h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft className="size-5" /> Back
      </Link>
      <div>
        <h1 className="text-2xl font-bold">What arrived?</h1>
        <p className="text-muted-foreground">{order.ref} · the driver recorded {expected} units delivered.</p>
      </div>
      <Card className="space-y-5 p-5">
        <Field label="Units you counted">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" aria-label="Fewer" onClick={() => setUnits((u) => Math.max(0, u - 1))}>-</Button>
            <span className={cn('w-24 text-center font-display text-4xl font-bold tabular-nums', short && 'text-late-fg')}>{units}</span>
            <Button size="icon" variant="outline" aria-label="More" onClick={() => setUnits((u) => Math.min(order.units, u + 1))}>+</Button>
          </div>
          {short && <span className="block text-sm font-medium text-late-fg">{expected - units} fewer than the driver recorded. This will be reported.</span>}
        </Field>
        <Field label="Any problem?">
          <div className="space-y-2" role="radiogroup">
            {ISSUES.map((i) => (
              <label key={i.v} className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3', issue === i.v && 'border-primary bg-accent')}>
                <input type="radio" name="issue" className="size-5 accent-[var(--primary)]" checked={issue === i.v} onChange={() => setIssue(i.v)} />
                <span className="font-medium">{i.label}</span>
              </label>
            ))}
          </div>
        </Field>
        {(issue !== 'none' || short) && (
          <>
            <Field label="What happened?" error={needsNote ? 'A short note helps us sort it out.' : undefined}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: 2 crates of yoghurt were leaking" />
            </Field>
            <Button variant={photo ? 'success' : 'outline'} size="lg" block onClick={() => setPhoto(!photo)}>
              <Camera /> {photo ? 'Photo attached' : 'Add a photo'}
            </Button>
          </>
        )}
        <Button
          size="xl"
          block
          disabled={needsNote}
          requiresOnline
          onClick={() => {
            act((w) => confirmReceipt(w, order.id, units, issue === 'none' ? undefined : { kind: issue, note: note.trim() }))
            toast.success(issue === 'none' && !short ? 'Thank you. Receipt confirmed.' : 'Thank you. The issue was sent to operations.')
            nav(`/manager/track/${order.id}`)
          }}
        >
          <Check /> Confirm receipt
        </Button>
      </Card>
    </div>
  )
}
