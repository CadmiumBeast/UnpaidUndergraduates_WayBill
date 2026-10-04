import { Bell, LogOut, Truck } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/domain/BrandMark'
import { NoticeBell } from '@/components/domain/NoticeBell'
import { OfflineBanner, SyncBadge } from '@/components/domain/OfflineBanner'
import { noticesFor } from '@/lib/access'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher'
import { translate, useLanguage } from '@/i18n'

export function LoaderLayout() {
  const nav = useNavigate()
  const session = useStore((s) => s.session)!
  const logout = useStore((s) => s.logout)
  const s = useStore((st) => st.world.s)
  const unread = noticesFor(s, session).filter((n) => !n.read).length
  const language = useLanguage()
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn('flex h-14 flex-1 items-center justify-center gap-2 rounded-lg text-base font-semibold', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')
  return (
    <div data-mode="dark" data-role="loader" className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <BrandMark />
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-sm font-semibold">{session.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.depot} dock · shared tablet</p>
          </div>
          <SyncBadge />
          <LanguageSwitcher compact />
          <NoticeBell to="/loader/notices" />
          <button
            className="grid size-11 place-items-center rounded-md hover:bg-accent"
            aria-label="Lock and sign out"
            onClick={() => {
              logout()
              nav('/login')
            }}
          >
            <LogOut className="size-5" />
          </button>
        </div>
        <OfflineBanner variant="desk" />
      </header>
      <main className="mx-auto max-w-5xl space-y-5 p-4 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-2 safe-bottom">
        <div className="mx-auto flex max-w-5xl gap-2">
          <NavLink to="/loader" end className={tab}>
            <Truck className="size-5" /> {translate(language, 'nav.vehicles')}
          </NavLink>
          <NavLink to="/loader/notices" className={tab}>
            <Bell className="size-5" /> {translate(language, 'nav.alerts')}{unread > 0 && <span className="rounded-full bg-deferred px-2 text-sm text-white">{unread}</span>}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
