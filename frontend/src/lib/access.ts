import type { Account } from '@/domain/accounts'
import type { Notice, ServerData } from '@/domain/types'

export function noticesFor(s: ServerData, acc: Account): Notice[] {
  const key = acc.role === 'driver' ? acc.vehicleId : acc.role === 'manager' ? acc.outletId : acc.depot
  return s.notices.filter((n) => n.to === acc.role && (!n.key || n.key === key))
}
