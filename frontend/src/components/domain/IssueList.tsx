import { CircleX, TriangleAlert } from 'lucide-react'
import type { Issue } from '@/domain/rules'
import { cn } from '@/lib/utils'

export function IssueList({ issues, className }: { issues: Issue[]; className?: string }) {
  if (issues.length === 0) return null
  return (
    <ul className={cn('space-y-1.5', className)}>
      {issues.map((i, k) => (
        <li
          key={k}
          className={cn(
            'flex items-start gap-2 rounded-md px-2.5 py-2 text-sm',
            i.severity === 'error' ? 'bg-deferred-bg text-deferred-fg' : 'bg-late-bg text-late-fg',
          )}
        >
          {i.severity === 'error' ? <CircleX className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  )
}
