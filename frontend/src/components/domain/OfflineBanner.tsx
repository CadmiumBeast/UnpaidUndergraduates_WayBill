import { RefreshCw, WifiOff } from 'lucide-react'
import { clockTime } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { translate, useLanguage } from '@/i18n'

export function OfflineBanner({ variant = 'driver' }: { variant?: 'driver' | 'desk' }) {
  const d = useStore((s) => s.world.d)
  const setOnline = useStore((s) => s.setOnline)
  const language = useLanguage()
  if (d.online) return null
  const pending = d.outbox.length
  return (
    <div role="status" className="flex items-center gap-3 border-b border-offline/40 bg-offline-bg px-4 py-2.5 text-sm text-offline-fg">
      <WifiOff className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{variant === 'driver' ? translate(language, 'offline.driverTitle') : translate(language, 'offline.deskTitle')}</p>
        <p className="text-xs opacity-90">
          {variant === 'driver'
            ? `${pending} record${pending === 1 ? '' : 's'} saved on this phone${d.offlineSince ? ` since ${clockTime(d.offlineSince)}` : ''}. They send automatically when the signal returns.`
            : 'Changes are paused until the connection comes back.'}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => setOnline(true)} className="shrink-0">
        <RefreshCw /> {translate(language, 'offline.tryNow')}
      </Button>
    </div>
  )
}

export function SyncBadge() {
  const d = useStore((s) => s.world.d)
  const language = useLanguage()
  if (!d.online) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-offline-bg px-2 py-0.5 text-xs font-semibold text-offline-fg">
      <WifiOff className="size-3.5" /> {translate(language, 'offline')}{d.outbox.length ? ` · ${d.outbox.length} waiting` : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-served-bg px-2 py-0.5 text-xs font-semibold text-served-fg">
      <span className="size-1.5 rounded-full bg-served" /> {translate(language, 'online')}
    </span>
  )
}
