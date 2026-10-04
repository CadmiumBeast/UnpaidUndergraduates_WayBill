import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const schema = z.object({ seal: z.string().min(2).max(40) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "LOADER") return error("Only loaders can confirm readiness", 403);
  const { id } = await context.params;
  const { seal } = schema.parse(await jsonBody<unknown>(request));
  const unresolved = await db.tripStop.count({ where: { tripId: id, loadState: { not: "LOADED" } } });
  if (unresolved) return error("Resolve every loading issue before sealing the vehicle", 422);
  const trip = await db.trip.update({ where: { id }, data: { status: "READY", seal } });
  await audit(session.userId, "TRIP_READY", "Trip", id, { seal });
  return ok(trip);
}
