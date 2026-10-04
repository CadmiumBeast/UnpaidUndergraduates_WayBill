import type { Depot, Role } from './types'

export interface Account {
  username: string
  pin: string
  name: string
  role: Role
  title: string
  depot?: Depot
  vehicleId?: string
  outletId?: string
}

// Demo accounts. All PINs are 1234.
export const ACCOUNTS: Account[] = [
  { username: 'kasun', pin: '1234', name: 'Kasun Perera', role: 'dispatcher', title: 'Delivery operations dispatcher', depot: 'Peliyagoda' },
  { username: 'sandun', pin: '1234', name: 'Sandun Fernando', role: 'loader', title: 'Loading operations associate', depot: 'Peliyagoda' },
  { username: 'ruwan', pin: '1234', name: 'Ruwan Jayasinghe', role: 'driver', title: 'Delivery driver', depot: 'Peliyagoda', vehicleId: 'VEH001' },
  { username: 'tharindu', pin: '1234', name: 'Tharindu Angelo', role: 'manager', title: 'Store manager, Waypoint Fresh Kadawatha', depot: 'Peliyagoda', outletId: 'OUT013' },
]

export const ROLE_HOME: Record<Role, string> = {
  dispatcher: '/dispatcher',
  loader: '/loader',
  driver: '/driver',
  manager: '/manager',
}

export const ROLE_LABEL: Record<Role, string> = {
  dispatcher: 'Dispatcher',
  loader: 'Loader',
  driver: 'Driver',
  manager: 'Store manager',
}
