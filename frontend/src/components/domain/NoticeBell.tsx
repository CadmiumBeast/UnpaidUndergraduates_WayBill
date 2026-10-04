import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { noticesFor } from '@/lib/access'
import { useStore } from '@/store/useStore'

export function NoticeBell({ to }: { to: string }) {
  const s = useStore((st) => st.world.s)
  const session = useStore((st) => st.session)
  const unread = session ? noticesFor(s, session).filter((n) => !n.read).length : 0
  return (
    <Link to={to} aria-label={`Notifications, ${unread} unread`} className="relative grid size-11 place-items-center rounded-md hover:bg-accent">
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-deferred px-1 text-[11px] font-bold leading-5 text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
