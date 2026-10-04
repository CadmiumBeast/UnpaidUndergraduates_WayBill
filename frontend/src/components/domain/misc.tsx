import type * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function PageHeader({
  title,
  sub,
  actions,
  className,
}: {
  title: string
  sub?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'deferred' | 'late' | 'served'
  icon?: React.ReactNode
}) {
  return (
    <Card className={cn('p-4', tone === 'deferred' && 'border-deferred/50 bg-deferred-bg/40', tone === 'late' && 'border-late/50 bg-late-bg/40')}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  )
}

export function EmptyState({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
    </div>
  )
}
