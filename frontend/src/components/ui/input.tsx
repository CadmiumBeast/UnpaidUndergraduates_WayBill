import * as React from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-md border border-input bg-card px-3 text-foreground placeholder:text-muted-foreground disabled:opacity-60'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { big?: boolean }>(
  function Input({ className, big, ...props }, ref) {
    return <input ref={ref} className={cn(base, big ? 'h-14 text-lg' : 'h-11 text-sm', className)} {...props} />
  },
)

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(base, 'h-11 text-sm', className)} {...props} />
})

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(base, 'min-h-20 py-2 text-sm', className)} {...props} />
  },
)

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs font-medium text-deferred-fg">
          {error}
        </span>
      )}
    </label>
  )
}
