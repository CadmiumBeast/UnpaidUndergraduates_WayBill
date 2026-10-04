import { cn } from '@/lib/utils'

export function BrandMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight', className)}>
      <svg viewBox="0 0 36 36" className="size-8" aria-hidden>
        <rect x="2" y="2" width="32" height="32" rx="8" className={light ? 'fill-white' : 'fill-primary'} />
        <path d="M27 2h7v7" className={light ? 'fill-primary' : 'fill-primary-foreground'} opacity=".22" />
        <path d="M10 8v20" className={light ? 'stroke-primary' : 'stroke-primary-foreground'} strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="9" r="2.7" className={light ? 'fill-primary' : 'fill-primary-foreground'} />
        <circle cx="10" cy="18" r="2.7" className="fill-secondary" />
        <circle cx="10" cy="27" r="2.7" className={light ? 'fill-primary' : 'fill-primary-foreground'} />
        <path d="M17 10h10M17 18h7M17 26h10" className={light ? 'stroke-primary' : 'stroke-primary-foreground'} strokeWidth="2" strokeLinecap="round" />
      </svg>
      Waybill
    </span>
  )
}
