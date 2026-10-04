import type { Brand, BudgetClass, Depot, District, Dock, Outlet, Parking } from './types'

// Placeholder reference data. The Fresh handling times and the Colombo/Gampaha travel times
// match the worked examples in the challenge brief; everything else is invented so the UI has
// something realistic to show. Swap in the real district_travel.csv / service_allowance.csv /
// outlets.csv values when you wire up the real dataset.

export const DISTRICTS: Record<string, District> = {
  Colombo: { name: 'Colombo', depot: 'Peliyagoda', outboundMin: 24, interMin: 8, outboundKm: 14, interKm: 3 },
  Gampaha: { name: 'Gampaha', depot: 'Peliyagoda', outboundMin: 37, interMin: 9, outboundKm: 28, interKm: 5 },
  Kalutara: { name: 'Kalutara', depot: 'Peliyagoda', outboundMin: 55, interMin: 10, outboundKm: 45, interKm: 6 },
  Kandy: { name: 'Kandy', depot: 'Kandy', outboundMin: 15, interMin: 7, outboundKm: 6, interKm: 2 },
  Matale: { name: 'Matale', depot: 'Kandy', outboundMin: 45, interMin: 10, outboundKm: 26, interKm: 6 },
}

export const ALLOWANCE: Record<Brand, Record<Dock, number>> = {
  Fresh: { rear_dock: 15, street: 16, mall_bay: 18 },
  Style: { rear_dock: 12, street: 14, mall_bay: 20 },
  Tech: { rear_dock: 18, street: 20, mall_bay: 22 },
}

export const BUDGET: Record<BudgetClass, number> = { fresh: 270, general: 480 }
export const DEPART_MIN: Record<BudgetClass, number> = { fresh: 3 * 60 + 30, general: 9 * 60 }
export const RELOAD_MIN = 20
export const MAX_TRIPS = 2

export const budgetClass = (brand: Brand): BudgetClass => (brand === 'Fresh' ? 'fresh' : 'general')

const STREETS = [
  'Main Street', 'Temple Road', 'Station Road', 'High Level Road', 'Church Lane',
  'Market Road', 'Lake Road', 'Galle Road', 'Kandy Road', 'Hospital Road',
]

let seq = 0
const mk = (
  brand: Brand,
  district: string,
  town: string,
  dock: Dock = 'rear_dock',
  parking: Parking = 'normal',
): Outlet => {
  seq += 1
  const n = seq
  const info = DISTRICTS[district]
  const freshOpen = ['05:00', '05:30', '06:00'][n % 3]
  const freshClose = ['07:30', '07:45', '08:00'][n % 3]
  const mall = parking === 'mall_dock'
  const label = brand === 'Fresh' ? `Waypoint Fresh ${town}` : brand === 'Style' ? `Waypoint Style ${town}` : `Waypoint Tech ${town}`
  return {
    id: `OUT${String(n).padStart(3, '0')}`,
    name: label,
    brand,
    district,
    depot: info.depot,
    dock,
    parking,
    address: `${10 + ((n * 7) % 90)} ${STREETS[n % STREETS.length]}, ${town}`,
    contact: `07${1 + (n % 8)} ${String(200 + ((n * 37) % 700)).padStart(3, '0')} ${String(1000 + ((n * 911) % 9000))}`,
    windowOpen: brand === 'Fresh' ? freshOpen : mall ? '10:00' : '09:00',
    windowClose: brand === 'Fresh' ? freshClose : mall ? '12:00' : '17:00',
    mallWindow: mall ? ['10:00', '12:00'] : undefined,
  }
}

export const OUTLETS: Outlet[] = [
  // Peliyagoda: Fresh, Colombo
  mk('Fresh', 'Colombo', 'Nugegoda', 'street'),
  mk('Fresh', 'Colombo', 'Dehiwala', 'street'),
  mk('Fresh', 'Colombo', 'Kollupitiya', 'rear_dock'),
  mk('Fresh', 'Colombo', 'Bambalapitiya', 'street'),
  mk('Fresh', 'Colombo', 'Borella', 'street', 'van_only'),
  mk('Fresh', 'Colombo', 'Maradana', 'street', 'van_only'),
  mk('Fresh', 'Colombo', 'Mount Lavinia', 'street'),
  mk('Fresh', 'Colombo', 'Rajagiriya', 'rear_dock'),
  mk('Fresh', 'Colombo', 'Battaramulla', 'rear_dock'),
  mk('Fresh', 'Colombo', 'Maharagama', 'street'),
  // Peliyagoda: Fresh, Gampaha
  mk('Fresh', 'Gampaha', 'Negombo', 'rear_dock'),
  mk('Fresh', 'Gampaha', 'Kiribathgoda', 'rear_dock'),
  mk('Fresh', 'Gampaha', 'Kadawatha', 'street'),
  mk('Fresh', 'Gampaha', 'Ja-Ela', 'rear_dock'),
  mk('Fresh', 'Gampaha', 'Wattala', 'street'),
  mk('Fresh', 'Gampaha', 'Minuwangoda', 'rear_dock'),
  mk('Fresh', 'Gampaha', 'Gampaha Town', 'street', 'van_only'),
  mk('Fresh', 'Gampaha', 'Ragama', 'rear_dock'),
  mk('Fresh', 'Gampaha', 'Kelaniya', 'street'),
  mk('Fresh', 'Gampaha', 'Nittambuwa', 'rear_dock'),
  // Peliyagoda: Fresh, Kalutara
  mk('Fresh', 'Kalutara', 'Panadura', 'rear_dock'),
  mk('Fresh', 'Kalutara', 'Horana', 'street'),
  mk('Fresh', 'Kalutara', 'Kalutara', 'rear_dock'),
  mk('Fresh', 'Kalutara', 'Beruwala', 'street'),
  mk('Fresh', 'Kalutara', 'Aluthgama', 'street'),
  mk('Fresh', 'Kalutara', 'Bandaragama', 'rear_dock'),
  // Peliyagoda: Style
  mk('Style', 'Colombo', 'City Centre Mall', 'mall_bay', 'mall_dock'),
  mk('Style', 'Colombo', 'Nugegoda', 'street'),
  mk('Style', 'Colombo', 'Galle Road', 'rear_dock'),
  mk('Style', 'Gampaha', 'Kiribathgoda Mall', 'mall_bay', 'mall_dock'),
  mk('Style', 'Gampaha', 'Negombo Road', 'street'),
  mk('Style', 'Gampaha', 'Kandana', 'rear_dock'),
  // Peliyagoda: Tech
  mk('Tech', 'Colombo', 'Hub', 'street'),
  mk('Tech', 'Colombo', 'Rajagiriya', 'rear_dock'),
  mk('Tech', 'Gampaha', 'Kadawatha', 'rear_dock'),
  mk('Tech', 'Kalutara', 'Panadura', 'street'),
  // Kandy depot
  mk('Fresh', 'Kandy', 'Peradeniya', 'rear_dock'),
  mk('Fresh', 'Kandy', 'Katugastota', 'street'),
  mk('Fresh', 'Kandy', 'Kandy City', 'street', 'van_only'),
  mk('Fresh', 'Kandy', 'Digana', 'rear_dock'),
  mk('Fresh', 'Matale', 'Matale Town', 'street'),
  mk('Fresh', 'Matale', 'Dambulla', 'rear_dock'),
  mk('Style', 'Kandy', 'City Mall', 'mall_bay', 'mall_dock'),
  mk('Style', 'Matale', 'Matale', 'street'),
  mk('Tech', 'Kandy', 'Kandy Tech', 'rear_dock'),
]

export const OUTLET_BY_ID: Record<string, Outlet> = Object.fromEntries(OUTLETS.map((o) => [o.id, o]))

export const DEPOTS: Depot[] = ['Peliyagoda', 'Kandy']
