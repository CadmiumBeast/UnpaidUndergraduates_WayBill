import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const schema = z.object({
  stopId: z.string().min(1),
  loadState: z.enum(["LOADED", "MISSING", "DAMAGED"]),
  units: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "LOADER") return error("Only loaders can update loading", 403);
  const { id } = await context.params;

  try {
    const input = schema.parse(await jsonBody<unknown>(request));
    const stop = await db.tripStop.findFirst({ where: { id: input.stopId, tripId: id }, include: { order: true } });
    if (!stop) return error("Trip stop not found", 404);
    const updated = await db.$transaction(async (tx) => {
      await tx.trip.update({ where: { id }, data: { status: "LOADING", version: { increment: 1 } } });
      await tx.order.update({ where: { id: stop.orderId }, data: { status: input.loadState === "LOADED" ? "LOADED" : "PLANNED" } });
      return tx.tripStop.update({
        where: { id: input.stopId },
        data: { loadState: input.loadState, loadIssue: input.loadState === "LOADED" ? undefined : { units: input.units ?? 0, note: input.note ?? "" } },
        include: { order: true },
      });
    });
    await audit(session.userId, "LOAD_UPDATED", "TripStop", input.stopId, input);
    return ok(updated);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to update loading");
  }
}
