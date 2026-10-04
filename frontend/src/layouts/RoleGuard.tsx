import { Navigate, Outlet } from 'react-router-dom'
import { ROLE_HOME } from '@/domain/accounts'
import type { Role } from '@/domain/types'
import { useStore } from '@/store/useStore'

export function RoleGuard({ role }: { role: Role }) {
  const session = useStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={ROLE_HOME[session.role]} replace />
  return <Outlet />
}
