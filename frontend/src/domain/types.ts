export type Role = 'dispatcher' | 'loader' | 'driver' | 'manager'
export type Brand = 'Fresh' | 'Style' | 'Tech'
export type Depot = 'Peliyagoda' | 'Kandy'
export type Temp = 'chilled' | 'ambient'
export type Dock = 'rear_dock' | 'street' | 'mall_bay'
export type Parking = 'normal' | 'van_only' | 'mall_dock'
export type BudgetClass = 'fresh' | 'general'

export interface District {
  name: string
  depot: Depot
  outboundMin: number
  interMin: number
  outboundKm: number
  interKm: number
}

export interface Outlet {
  id: string
  name: string
  brand: Brand
  district: string
  depot: Depot
  dock: Dock
  parking: Parking
  address: string
  contact: string
  windowOpen: string
  windowClose: string
  mallWindow?: [string, string]
}

export type VehicleStatus = 'available' | 'in_workshop' | 'broken_down'

export interface Vehicle {
  id: string
  plate: string
  type: 'truck' | 'van'
  temp: 'reefer' | 'ambient'
  weightCap: number
  volumeCap: number
  kmPerL: number
  weeklyQuotaL: number
  usedL: number
  depot: Depot
  status: VehicleStatus
  driver: string
}

export type OrderStatus =
  | 'next_run'
  | 'confirmed'
  | 'planned'
  | 'loaded'
  | 'out'
  | 'delivered'
  | 'partial'
  | 'refused'
  | 'failed'
  | 'deferred'

export type OutcomeKind = 'delivered' | 'partial' | 'refused' | 'failed'

export interface Outcome {
  kind: OutcomeKind
  at: string
  unitsDelivered?: number
  proof?: 'code' | 'photo'
  reason?: string
  recordedOffline?: boolean
}

export interface LoadIssue {
  kind: 'missing' | 'damaged'
  units: number
  note: string
  resolution?: 'short_ship' | 'substitute' | 'defer'
}

export interface Receipt {
  at: string
  unitsReceived: number
  issue?: { kind: 'missing' | 'damaged' | 'wrong_item'; note: string }
}

export interface Order {
  id: string
  ref: string
  outletId: string
  brand: Brand
  district: string
  depot: Depot
  temp: Temp
  units: number
  weightKg: number
  volumeM3: number
  status: OrderStatus
  placedAt: string
  tripId?: string
  deferReason?: string
  deferredAt?: string
  stranded?: boolean
  deferredYesterday: boolean
  daysSinceLastServed: number
  handoffCode?: string
  loadState?: 'pending' | 'loaded' | 'issue'
  loadIssue?: LoadIssue
  outcome?: Outcome
  receipt?: Receipt
}

export type TripStatus = 'draft' | 'published' | 'loading' | 'ready' | 'departed' | 'done' | 'stranded'

export interface Trip {
  id: string
  vehicleId: string
  tripNo: 1 | 2
  brand: Brand
  district: string
  depot: Depot
  orderIds: string[]
  status: TripStatus
  version: number
  changes: { v: number; at: string; text: string }[]
  seal?: string
  departedAt?: string
  pretrip?: { fridgeC?: number; fuelOk: boolean; sealOk: boolean }
}

export interface Notice {
  id: string
  ts: string
  to: Role
  key?: string
  title: string
  body: string
  kind: 'info' | 'warning' | 'success' | 'danger'
  read: boolean
}

export interface LogEvent {
  id: string
  ts: string
  actor: string
  text: string
}

export interface Playbook {
  chilled: number
  skipped: number
  days: number
  fresh: number
}

export interface ServerData {
  epoch: string
  preset: string
  dayLabel: string
  phase: 'ordering' | 'planning' | 'published'
  orders: Order[]
  trips: Trip[]
  vehicles: Vehicle[]
  notices: Notice[]
  events: LogEvent[]
  playbook: Playbook
  seen: Record<string, number>
  devices: Record<string, { online: boolean; since?: string; lastSeen: string }>
  counters: { order: number; trip: number; notice: number; event: number }
}

export type OutboxItem =
  | { id: string; ts: string; type: 'start_trip'; tripId: string; pretrip: NonNullable<Trip['pretrip']> }
  | { id: string; ts: string; type: 'outcome'; tripId: string; orderId: string; outcome: Outcome }
  | { id: string; ts: string; type: 'problem'; tripId: string; orderId?: string; text: string }

export interface Conflict {
  id: string
  orderId: string
  tripId: string
  kind: 'deferred' | 'reassigned' | 'stranded'
  serverNote: string
  item: Extract<OutboxItem, { type: 'outcome' }>
  at: string
  resolved?: 'kept' | 'accepted'
}

export interface DeviceData {
  scopeVehicle?: string
  online: boolean
  offlineSince?: string
  cache: Record<string, { trip: Trip; orders: Order[] }>
  outbox: OutboxItem[]
  conflicts: Conflict[]
  lastSyncedAt: string
}

export interface World {
  s: ServerData
  d: DeviceData
}
