import {
  Activity,
  BarChart3,
  ClipboardList,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  PauseCircle,
  Radar,
  ShieldCheck,
  Sunset,
  Workflow,
} from 'lucide-react'
import * as React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/domain/BrandMark'
import { Chip } from '@/components/domain/chips'
import { NoticeBell } from '@/components/domain/NoticeBell'
import { OfflineBanner, SyncBadge } from '@/components/domain/OfflineBanner'
import { DEPOTS } from '@/domain/reference'
import { cn } from '@/lib/utils'
import { useDepot, useUi } from '@/store/ui'
import { useStore } from '@/store/useStore'
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher'
import { translate, useLanguage } from '@/i18n'

const NAV = [
  { to: '/dispatcher', key: 'nav.today', icon: LayoutDashboard, end: true },
  { to: '/dispatcher/orders', key: 'nav.orders', icon: ClipboardList },
  { to: '/dispatcher/planning', key: 'nav.planning', icon: Workflow },
  { to: '/dispatcher/deferrals', key: 'nav.deferrals', icon: PauseCircle },
  { to: '/dispatcher/runs', key: 'nav.runs', icon: Radar },
  { to: '/dispatcher/fleet', key: 'nav.fleet', icon: Fuel },
  { to: '/dispatcher/endofday', key: 'nav.endOfDay', icon: Sunset },
  { to: '/dispatcher/outlook', key: 'nav.outlook', icon: BarChart3 },
  { to: '/dispatcher/team', key: 'nav.team', icon: ShieldCheck },
  { to: '/dispatcher/activity', key: 'nav.activity', icon: Activity },
]

export function DispatcherLayout() {
  const [open, setOpen] = React.useState(false)
  const nav = useNavigate()
  const session = useStore((s) => s.session)!
  const logout = useStore((s) => s.logout)
  const phase = useStore((s) => s.world.s.phase)
  const day = useStore((s) => s.world.s.dayLabel)
  const depot = useDepot()
  const setDepot = useUi((s) => s.setDepot)
  const language = useLanguage()

  const links = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium',
              isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
            )
          }
        >
          <n.icon className="size-5" /> {translate(language, n.key)}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div data-mode="light" data-role="dispatcher" className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r bg-card p-4 lg:block">
        <div className="mb-6 px-2">
          <BrandMark />
        </div>
        {links}
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-4 py-2 backdrop-blur">
          <button className="grid size-11 place-items-center rounded-md hover:bg-accent lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <select
              aria-label="Depot"
              value={depot}
              onChange={(e) => setDepot(e.target.value as (typeof DEPOTS)[number])}
              className="-ml-1 max-w-full rounded-md bg-transparent py-0.5 pr-1 text-sm font-semibold hover:bg-accent"
            >
              {DEPOTS.map((d) => (
                <option key={d} value={d}>{d} depot</option>
              ))}
            </select>
            <p className="truncate text-xs text-muted-foreground">{day}</p>
          </div>
          {phase === 'ordering' && <Chip tone="ontime">Orders open until 4:00 PM</Chip>}
          {phase === 'planning' && <Chip tone="late">Orders closed. Plan needed</Chip>}
          {phase === 'published' && <Chip tone="served">Plan published</Chip>}
          <SyncBadge />
          <LanguageSwitcher compact />
          <NoticeBell to="/dispatcher/notices" />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{session.name}</p>
            <p className="text-xs text-muted-foreground">Dispatcher</p>
          </div>
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
        </header>
        {open && <div className="border-b bg-card p-3 lg:hidden">{links}</div>}
        <OfflineBanner variant="desk" />
        <main className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
