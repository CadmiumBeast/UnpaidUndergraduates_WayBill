import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, ok } from "@/lib/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "DISPATCHER") return error("Only dispatchers can publish plans", 403);
  const { id } = await context.params;

  const plan = await db.plan.findUnique({ where: { id }, include: { trips: { include: { stops: true } } } });
  if (!plan) return error("Plan not found", 404);
  if (!plan.trips.length || plan.trips.some((trip) => !trip.stops.length)) return error("Every trip needs at least one stop", 422);

  const published = await db.$transaction(async (tx) => {
    await tx.plan.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date(), version: { increment: 1 } } });
    for (const trip of plan.trips) {
      await tx.trip.update({ where: { id: trip.id }, data: { status: "PUBLISHED", version: { increment: 1 } } });
      await tx.order.updateMany({ where: { tripStop: { tripId: trip.id } }, data: { status: "PLANNED" } });
    }
    return tx.plan.findUnique({ where: { id }, include: { trips: { include: { vehicle: true, stops: { include: { order: true } } } } } });
  });
  await audit(session.userId, "PLAN_PUBLISHED", "Plan", id);
  return ok(published);
}
