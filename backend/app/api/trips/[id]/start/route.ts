import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, ok } from "@/lib/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "DRIVER") return error("Only drivers can start trips", 403);
  const { id } = await context.params;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  const trip = await db.trip.findUnique({ where: { id } });
  if (!trip || trip.vehicleId !== user?.vehicleId) return error("Trip not found for this driver", 404);
  if (trip.status !== "READY") return error("Trip must be ready before departure", 422);
  const started = await db.trip.update({ where: { id }, data: { status: "DEPARTED", departedAt: new Date() } });
  await db.order.updateMany({ where: { tripStop: { tripId: id } }, data: { status: "OUT" } });
  await audit(session.userId, "TRIP_STARTED", "Trip", id);
  return ok(started);
}
