import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const tripSchema = z.object({
  vehicleId: z.string().min(1),
  tripNo: z.number().int().min(1).max(2),
  brand: z.string().min(1),
  district: z.string().min(1),
  orderIds: z.array(z.string()).min(1),
});

const planSchema = z.object({ depot: z.string().min(1), trips: z.array(tripSchema).min(1) });

export async function GET() {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const plans = await db.plan.findMany({
    include: { trips: { include: { vehicle: true, stops: { include: { order: { include: { outlet: true } } } } } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(plans);
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "DISPATCHER") return error("Only dispatchers can create plans", 403);

  try {
    const input = planSchema.parse(await jsonBody<unknown>(request));
    const requestedOrderIds = input.trips.flatMap((trip) => trip.orderIds);
    if (new Set(requestedOrderIds).size !== requestedOrderIds.length) return error("An order can only appear once in a plan", 422);
    const orders = await db.order.findMany({
      where: { id: { in: requestedOrderIds } },
      include: { outlet: true },
    });
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    const vehicleIds = input.trips.map((trip) => trip.vehicleId);
    const vehicles = await db.vehicle.findMany({ where: { id: { in: vehicleIds } } });
    const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

    for (const trip of input.trips) {
      const vehicle = vehicleMap.get(trip.vehicleId);
      if (!vehicle || vehicle.status !== "AVAILABLE") return error(`Vehicle ${trip.vehicleId} is not available`, 422);
      const tripOrders = trip.orderIds.map((orderId) => orderMap.get(orderId)).filter((order): order is (typeof orders)[number] => Boolean(order));
      const totalWeight = tripOrders.reduce((sum, order) => sum + order.weightKg, 0);
      const totalVolume = tripOrders.reduce((sum, order) => sum + order.volumeM3, 0);
      if (totalWeight > vehicle.weightCapKg) return error(`${trip.vehicleId} exceeds its weight capacity`, 422);
      if (totalVolume > vehicle.volumeCapM3) return error(`${trip.vehicleId} exceeds its volume capacity`, 422);
      for (const orderId of trip.orderIds) {
        const order = orderMap.get(orderId);
        if (!order) return error(`Order ${orderId} was not found`, 422);
        if (order.depot !== input.depot) return error(`${order.ref} belongs to another depot`, 422);
        if (order.brand !== trip.brand || order.district !== trip.district) return error(`${order.ref} must stay within one brand and district per trip`, 422);
        if (order.temp === "CHILLED" && vehicle.temp !== "REEFER") return error(`${order.ref} needs a refrigerated vehicle`, 422);
        if (order.outlet.parking === "van_only" && vehicle.type !== "van") return error(`${order.ref} requires a van-only vehicle`, 422);
      }
    }

    const plan = await db.$transaction(async (tx) => {
      const created = await tx.plan.create({ data: { depot: input.depot } });
      for (const tripInput of input.trips) {
        const trip = await tx.trip.create({
          data: {
            planId: created.id,
            vehicleId: tripInput.vehicleId,
            tripNo: tripInput.tripNo,
            brand: tripInput.brand,
            district: tripInput.district,
            depot: input.depot,
            stops: {
              create: tripInput.orderIds.map((orderId, index) => ({ orderId, stopNumber: index + 1 })),
            },
          },
          include: { stops: true },
        });
        await Promise.all(
          trip.stops.map((stop) =>
            tx.order.update({ where: { id: stop.orderId }, data: { status: "PLANNED", planVersion: { increment: 1 } } }),
          ),
        );
      }
      return tx.plan.findUnique({
        where: { id: created.id },
        include: { trips: { include: { vehicle: true, stops: { include: { order: true } } } } },
      });
    });
    await audit(session.userId, "PLAN_CREATED", "Plan", plan!.id, { tripCount: input.trips.length });
    return ok(plan, { status: 201 });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to create plan");
  }
}
