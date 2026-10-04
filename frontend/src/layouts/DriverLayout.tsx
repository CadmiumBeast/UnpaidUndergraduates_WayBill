import { Bell, LogOut, RefreshCw, Route } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { OfflineBanner, SyncBadge } from '@/components/domain/OfflineBanner'
import { noticesFor } from '@/lib/access'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher'
import { translate, useLanguage } from '@/i18n'

export function DriverLayout() {
  const nav = useNavigate()
  const session = useStore((s) => s.session)!
  const logout = useStore((s) => s.logout)
  const s = useStore((st) => st.world.s)
  const d = useStore((st) => st.world.d)
  const unread = noticesFor(s, session).filter((n) => !n.read).length
  const pendingConflicts = d.conflicts.filter((c) => !c.resolved).length
  const language = useLanguage()
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn('relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-semibold', isActive ? 'bg-accent text-primary' : 'text-muted-foreground')
  return (
    <div data-mode="dark" data-role="driver" className="min-h-dvh bg-background text-foreground sm:bg-black/90">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background sm:border-x">
        <header className="sticky top-0 z-30 border-b bg-card">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{session.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session.vehicleId} · {session.depot}</p>
            </div>
            <SyncBadge />
            <LanguageSwitcher compact />
            <button
              className="grid size-11 place-items-center rounded-md hover:bg-accent"
              aria-label="Sign out"
              onClick={() => {
                logout()
                nav('/login')
              }}
            >
              <LogOut className="size-5" />
            </button>
          </div>
          <OfflineBanner variant="driver" />
        </header>
        <main className="flex-1 space-y-4 p-4 pb-28">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t bg-card p-2 safe-bottom">
          <div className="flex gap-1">
            <NavLink to="/driver" end className={tab}>
              <Route className="size-6" /> {translate(language, 'nav.trips')}
            </NavLink>
            <NavLink to="/driver/sync" className={tab}>
              <RefreshCw className="size-6" /> {translate(language, 'nav.sync')}
              {(d.outbox.length > 0 || pendingConflicts > 0) && (
                <span className="absolute right-4 top-1 grid min-w-5 place-items-center rounded-full bg-late px-1 text-[11px] font-bold text-black">{d.outbox.length + pendingConflicts}</span>
              )}
            </NavLink>
            <NavLink to="/driver/notices" className={tab}>
              <Bell className="size-6" /> {translate(language, 'nav.alerts')}
              {unread > 0 && <span className="absolute right-4 top-1 grid min-w-5 place-items-center rounded-full bg-deferred px-1 text-[11px] font-bold text-white">{unread}</span>}
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  )
}
