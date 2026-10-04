import { DEFAULT_PLAYBOOK } from './planner'
import { OUTLETS } from './reference'
import type { Order, Outlet, ServerData, Vehicle } from './types'

export const MANAGER_OUTLET = 'OUT013'
export const DAY_LABEL = 'Wednesday, 30 September'

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type VRow = [string, 'truck' | 'van', 'reefer' | 'ambient', number, number, number, number, 'Peliyagoda' | 'Kandy', Vehicle['status'], string, number]

const VROWS: VRow[] = [
  ['VEH001', 'truck', 'reefer', 3500, 20, 5, 260, 'Peliyagoda', 'available', 'Ruwan Jayasinghe', 90],
  ['VEH002', 'truck', 'reefer', 3500, 20, 5, 260, 'Peliyagoda', 'in_workshop', 'Nimal Fernando', 0],
  ['VEH003', 'truck', 'reefer', 3200, 18, 5.2, 240, 'Peliyagoda', 'available', 'Kamal Perera', 222],
  ['VEH004', 'van', 'reefer', 900, 7, 9, 130, 'Peliyagoda', 'available', 'Chaminda Silva', 40],
  ['VEH005', 'van', 'reefer', 900, 7, 9, 130, 'Peliyagoda', 'available', 'Ashan Wijesinghe', 55],
  ['VEH006', 'truck', 'ambient', 4500, 28, 4.5, 260, 'Peliyagoda', 'available', 'Dilan Rajapaksa', 70],
  ['VEH007', 'truck', 'ambient', 4500, 28, 4.5, 260, 'Peliyagoda', 'available', 'Priyantha Kumara', 60],
  ['VEH008', 'truck', 'ambient', 3000, 18, 5, 240, 'Peliyagoda', 'available', 'Sanjeewa Bandara', 80],
  ['VEH009', 'truck', 'ambient', 3000, 18, 5, 240, 'Peliyagoda', 'available', 'Lasantha Gunawardena', 50],
  ['VEH010', 'truck', 'ambient', 4500, 28, 4.5, 260, 'Peliyagoda', 'in_workshop', 'Upul Senanayake', 0],
  ['VEH011', 'truck', 'ambient', 4500, 28, 4.5, 260, 'Peliyagoda', 'in_workshop', 'Mahesh Dias', 0],
  ['VEH012', 'truck', 'ambient', 3000, 18, 5, 240, 'Peliyagoda', 'available', 'Thilina Herath', 75],
  ['VEH013', 'truck', 'ambient', 3000, 18, 5, 240, 'Peliyagoda', 'available', 'Roshan Peiris', 30],
  ['VEH014', 'van', 'ambient', 900, 8, 10, 110, 'Peliyagoda', 'available', 'Suresh Abeysekera', 40],
  ['VEH015', 'van', 'ambient', 900, 8, 10, 110, 'Peliyagoda', 'in_workshop', 'Ishan Rathnayake', 0],
  ['VEH016', 'van', 'ambient', 900, 8, 10, 110, 'Peliyagoda', 'available', 'Ishara Mendis', 35],
  ['VEH031', 'truck', 'reefer', 3200, 18, 5, 240, 'Kandy', 'available', 'Sampath Ekanayake', 60],
  ['VEH032', 'van', 'reefer', 900, 7, 9, 130, 'Kandy', 'available', 'Nuwan Jayawardena', 30],
  ['VEH033', 'truck', 'ambient', 4200, 26, 4.5, 250, 'Kandy', 'available', 'Gayan Wickramasinghe', 65],
  ['VEH034', 'truck', 'ambient', 3000, 18, 5, 240, 'Kandy', 'available', 'Prasad Liyanage', 55],
  ['VEH035', 'truck', 'ambient', 3000, 18, 5, 240, 'Kandy', 'available', 'Ajith Kumara', 45],
  ['VEH036', 'van', 'ambient', 900, 8, 10, 110, 'Kandy', 'available', 'Rohan De Silva', 20],
]

export function buildVehicles(): Vehicle[] {
  return VROWS.map(([id, type, temp, weightCap, volumeCap, kmPerL, weeklyQuotaL, depot, status, driver, usedL]) => ({
    id,
    plate: `${['WP', 'CP', 'NW'][id.length % 3]} ${['CAB', 'KL', 'PH', 'LX'][Number(id.slice(-1)) % 4]}-${String(1000 + Number(id.slice(3)) * 37).slice(-4)}`,
    type,
    temp,
    weightCap,
    volumeCap,
    kmPerL,
    weeklyQuotaL,
    usedL,
    depot,
    status,
    driver,
  }))
}

const isoToday = (h: number, m: number) => {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

interface Spec {
  units: [number, number]
  kg: number
  m3: number
}
const SPEC = {
  freshAmbient: { units: [28, 64], kg: 21, m3: 0.105 } as Spec,
  freshChilled: { units: [16, 40], kg: 17, m3: 0.085 } as Spec,
  style: { units: [40, 90], kg: 9, m3: 0.13 } as Spec,
  tech: { units: [2, 6], kg: 85, m3: 0.42 } as Spec,
}

export function buildOrders(includeManagerOutlet: boolean): Order[] {
  const rand = rng(20260930)
  const orders: Order[] = []
  let n = 1000
  const add = (o: Outlet, temp: 'ambient' | 'chilled', spec: Spec) => {
    const cap = o.parking === 'van_only' ? 34 : spec.units[1]
    const units = Math.min(cap, Math.round(spec.units[0] + rand() * (spec.units[1] - spec.units[0])))
    const weightKg = Math.round(units * spec.kg)
    const volumeM3 = Math.round(units * spec.m3 * 10) / 10
    n += 1
    const skipped = rand() < 0.14
    orders.push({
      id: `ORD-${n}`,
      ref: `ORD-${n}`,
      outletId: o.id,
      brand: o.brand,
      district: o.district,
      depot: o.depot,
      temp,
      units,
      weightKg,
      volumeM3,
      status: 'confirmed',
      placedAt: isoToday(9 + Math.floor(rand() * 6), Math.floor(rand() * 60)),
      deferredYesterday: skipped,
      daysSinceLastServed: skipped ? 2 + Math.floor(rand() * 3) : Math.floor(rand() * 2) + 1,
    })
  }
  for (const o of OUTLETS) {
    if (!includeManagerOutlet && o.id === 'OUT013') continue
    if (o.brand === 'Fresh') {
      add(o, 'ambient', SPEC.freshAmbient)
      if (rand() < 0.72) add(o, 'chilled', SPEC.freshChilled)
    } else if (o.brand === 'Style') add(o, 'ambient', SPEC.style)
    else add(o, 'ambient', SPEC.tech)
  }
  return orders
}

export function baseServer(includeManagerOutlet = false): ServerData {
  const orders = buildOrders(includeManagerOutlet)
  return {
    epoch: String(Date.now()),
    preset: 'ordering',
    dayLabel: DAY_LABEL,
    phase: 'ordering',
    orders,
    trips: [],
    vehicles: buildVehicles(),
    notices: [],
    events: [],
    playbook: { ...DEFAULT_PLAYBOOK },
    seen: {},
    devices: {},
    counters: { order: 1000 + orders.length, trip: 0, notice: 0, event: 0 },
  }
}

export function estimateSize(brand: 'Fresh' | 'Style' | 'Tech', temp: 'ambient' | 'chilled', units: number) {
  const spec = brand === 'Fresh' ? (temp === 'chilled' ? SPEC.freshChilled : SPEC.freshAmbient) : brand === 'Style' ? SPEC.style : SPEC.tech
  return { weightKg: Math.round(units * spec.kg), volumeM3: Math.round(units * spec.m3 * 10) / 10 }
}
