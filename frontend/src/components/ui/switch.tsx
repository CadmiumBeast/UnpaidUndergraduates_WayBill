import { cn } from '@/lib/utils'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full border transition-colors', checked ? 'border-primary bg-primary' : 'bg-muted')}
    >
      <span
        className={cn(
          'absolute top-0.5 size-6 rounded-full bg-card shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}
