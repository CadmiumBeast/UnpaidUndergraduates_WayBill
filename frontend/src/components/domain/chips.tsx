import {
  Ban,
  CircleCheck,
  CirclePause,
  Clock,
  GitMerge,
  PackageCheck,
  RefreshCw,
  Snowflake,
  Sun,
  TriangleAlert,
  Truck,
  WifiOff,
} from 'lucide-react'
import type * as React from 'react'
import type { Brand, OrderStatus, Temp } from '@/domain/types'
import { cn } from '@/lib/utils'

export type Tone = 'served' | 'ontime' | 'late' | 'deferred' | 'conflict' | 'syncing' | 'offline'

const TONE: Record<Tone, string> = {
  served: 'bg-served-bg text-served-fg',
  ontime: 'bg-ontime-bg text-ontime-fg',
  late: 'bg-late-bg text-late-fg',
  deferred: 'bg-deferred-bg text-deferred-fg',
  conflict: 'bg-conflict-bg text-conflict-fg',
  syncing: 'bg-syncing-bg text-syncing-fg',
  offline: 'bg-offline-bg text-offline-fg',
}

const TONE_ICON: Record<Tone, React.ComponentType<{ className?: string }>> = {
  served: CircleCheck,
  ontime: Clock,
  late: TriangleAlert,
  deferred: CirclePause,
  conflict: GitMerge,
  syncing: RefreshCw,
  offline: WifiOff,
}

export function Chip({
  tone,
  children,
  icon,
  className,
}: {
  tone: Tone
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const Icon = icon ?? TONE_ICON[tone]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', TONE[tone], className)}>
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}

const ORDER: Record<OrderStatus, { tone: Tone; label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  next_run: { tone: 'offline', label: 'Next run' },
  confirmed: { tone: 'ontime', label: 'Confirmed' },
  planned: { tone: 'ontime', label: 'Planned', icon: Clock },
  loaded: { tone: 'ontime', label: 'Loaded', icon: PackageCheck },
  out: { tone: 'syncing', label: 'On the way', icon: Truck },
  delivered: { tone: 'served', label: 'Delivered' },
  partial: { tone: 'late', label: 'Partly delivered' },
  refused: { tone: 'deferred', label: 'Refused', icon: Ban },
  failed: { tone: 'deferred', label: 'Not delivered', icon: Ban },
  deferred: { tone: 'deferred', label: 'Deferred' },
}

export function OrderStatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER[status]
  return (
    <Chip tone={s.tone} icon={s.icon} className={className}>
      {s.label}
    </Chip>
  )
}

export function TempTag({ temp, className }: { temp: Temp; className?: string }) {
  return temp === 'chilled' ? (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-chilled-bg px-1.5 py-0.5 text-xs font-semibold text-chilled', className)}>
      <Snowflake className="size-3.5" />
      Chilled
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-ambient-bg px-1.5 py-0.5 text-xs font-semibold text-ambient', className)}>
      <Sun className="size-3.5" />
      Ambient
    </span>
  )
}

const BRAND: Record<Brand, string> = {
  Fresh: 'bg-brand-fresh-bg text-brand-fresh',
  Style: 'bg-brand-style-bg text-brand-style',
  Tech: 'bg-brand-tech-bg text-brand-tech',
}

export function BrandTag({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold', BRAND[brand], className)}>{brand}</span>
  )
}

export function Stamp({ tone, children }: { tone: 'served' | 'deferred' | 'late'; children: React.ReactNode }) {
  const c = tone === 'served' ? 'text-served' : tone === 'deferred' ? 'text-deferred' : 'text-late'
  return <span className={cn('stamp text-sm', c)}>{children}</span>
}
