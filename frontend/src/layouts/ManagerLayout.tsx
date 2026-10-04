import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/domain/BrandMark'
import { NoticeBell } from '@/components/domain/NoticeBell'
import { OfflineBanner } from '@/components/domain/OfflineBanner'
import { OUTLET_BY_ID } from '@/domain/reference'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher'
import { translate, useLanguage } from '@/i18n'

export function ManagerLayout() {
  const nav = useNavigate()
  const session = useStore((s) => s.session)!
  const logout = useStore((s) => s.logout)
  const outlet = OUTLET_BY_ID[session.outletId!]
  const language = useLanguage()
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('flex h-11 items-center rounded-md px-3 text-sm font-medium', isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')
  return (
    <div data-mode="light" data-role="manager" className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <BrandMark />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{outlet.name}</p>
            <p className="truncate text-xs text-muted-foreground">{outlet.district} · {session.name}</p>
          </div>
          <NoticeBell to="/manager/notices" />
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
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 pb-2">
          <NavLink to="/manager" end className={link}>{translate(language, 'nav.today')}</NavLink>
          <NavLink to="/manager/order" className={link}>{translate(language, 'nav.orders')}</NavLink>
          <NavLink to="/manager/history" className={link}>{translate(language, 'nav.activity')}</NavLink>
          <NavLink to="/manager/notices" className={link}>{translate(language, 'nav.notifications')}</NavLink>
        </nav>
      </header>
      <OfflineBanner variant="desk" />
      <main className="mx-auto max-w-4xl space-y-5 p-4 pb-16">
        <Outlet />
      </main>
    </div>
  )
}
