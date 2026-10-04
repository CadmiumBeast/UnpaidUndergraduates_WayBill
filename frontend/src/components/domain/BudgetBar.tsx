import { cn } from '@/lib/utils'

export function BudgetBar({
  label,
  value,
  max,
  unit,
  decimals = 0,
  note,
  compact,
}: {
  label: string
  value: number
  max: number
  unit: string
  decimals?: number
  note?: string
  compact?: boolean
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const over = value > max + 1e-9
  const tone = over ? 'bg-deferred' : pct >= 85 ? 'bg-late' : 'bg-served'
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
  return (
    <div className={cn('space-y-1', compact && 'text-xs')}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', over && 'text-deferred-fg')}>
          {fmt(value)} / {fmt(max)} {unit}
          {over && ' (over)'}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
      >
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}
