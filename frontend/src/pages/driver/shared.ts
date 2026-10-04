import { checkTrip } from '@/domain/rules'
import type { Order, Trip, World } from '@/domain/types'

// The driver's phone always reads from its local copy, which is refreshed whenever there is signal.
export function driverTrips(w: World, vehicleId: string) {
  return Object.values(w.d.cache)
    .filter((c) => c.trip.vehicleId === vehicleId && c.trip.status !== 'stranded')
    .sort((a, b) => a.trip.tripNo - b.trip.tripNo)
}

export function driverEtas(w: World, trip: Trip, orders: Order[]) {
  const vehicle = w.s.vehicles.find((v) => v.id === trip.vehicleId)!
  const siblings = Object.values(w.d.cache)
    .filter((c) => c.trip.vehicleId === trip.vehicleId && c.trip.id !== trip.id && c.trip.status !== 'stranded')
    .map((c) => ({ tripNo: c.trip.tripNo, orders: c.orders }))
  return checkTrip(orders, vehicle, trip.tripNo, siblings).metrics
}
