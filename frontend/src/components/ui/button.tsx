import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:opacity-50 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-95',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-105',
        outline: 'border border-input bg-card text-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent',
        danger: 'bg-destructive text-destructive-foreground hover:brightness-110',
        success: 'bg-served text-white hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-5 text-base [&_svg]:size-5',
        xl: 'h-14 px-6 text-lg font-semibold [&_svg]:size-6',
        icon: 'size-11 [&_svg]:size-5',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  requiresOnline?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, requiresOnline, disabled, title, type = 'button', ...props },
  ref,
) {
  const online = useStore((s) => s.world.d.online)
  const blocked = requiresOnline && !online
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || blocked}
      title={blocked ? 'Needs a connection' : title}
      {...props}
    />
  )
})
