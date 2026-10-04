import { Check } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export interface RouteStep {
  id: string
  title: React.ReactNode
  sub?: React.ReactNode
  aside?: React.ReactNode
  state: 'done' | 'current' | 'next' | 'issue'
  label?: string
}

// The signature motif: numbered stops on a line. Done = filled, current = ringed, next = hollow.
export function RouteLine({ steps, className, onSelect }: { steps: RouteStep[]; className?: string; onSelect?: (id: string) => void }) {
  return (
    <ol className={cn('relative', className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn('absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5', s.state === 'done' ? 'bg-secondary' : 'border-l-2 border-dashed border-input bg-transparent w-0')}
              />
            )}
            <span
              aria-label={s.label ?? s.state}
              className={cn(
                'z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold',
                s.state === 'done' && 'border-secondary bg-secondary text-secondary-foreground',
                s.state === 'current' && 'border-primary bg-card text-primary ring-4 ring-primary/25',
                s.state === 'next' && 'border-input bg-card text-muted-foreground',
                s.state === 'issue' && 'border-deferred bg-deferred-bg text-deferred-fg',
              )}
            >
              {s.state === 'done' ? <Check className="size-4" /> : i + 1}
            </span>
            <div
              className={cn('min-w-0 flex-1', onSelect && 'cursor-pointer')}
              onClick={onSelect ? () => onSelect(s.id) : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={cn('min-w-0 text-sm font-medium', s.state === 'done' && 'text-muted-foreground')}>{s.title}</div>
                {s.aside && <div className="shrink-0 text-xs text-muted-foreground">{s.aside}</div>}
              </div>
              {s.sub && <div className="text-xs text-muted-foreground">{s.sub}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
