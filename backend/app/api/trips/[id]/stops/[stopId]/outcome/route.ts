import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const schema = z.object({
  kind: z.enum(["DELIVERED", "PARTIAL", "REFUSED", "FAILED"]),
  unitsDelivered: z.number().int().nonnegative().optional(),
  proof: z.enum(["CODE", "PHOTO"]).optional(),
  receivingCode: z.string().optional(),
  reason: z.string().max(500).optional(),
  recordedOffline: z.boolean().optional().default(false),
  eventId: z.string().min(8).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "DRIVER") return error("Only drivers can record delivery outcomes", 403);
  const { id, stopId } = await context.params;

  try {
    const input = schema.parse(await jsonBody<unknown>(request));
    const user = await db.user.findUnique({ where: { id: session.userId } });
    const stop = await db.tripStop.findFirst({ where: { id: stopId, tripId: id }, include: { order: true, trip: true } });
    if (!stop || stop.trip.vehicleId !== user?.vehicleId) return error("Trip stop not found for this driver", 404);
    if (input.proof === "CODE" && input.receivingCode !== stop.order.handoffCode) return error("The receiving code does not match", 422);
    if (input.kind !== "DELIVERED" && !input.reason) return error("A reason is required for an incomplete delivery", 422);

    const eventId = input.eventId ?? crypto.randomUUID();
    const event = await db.$transaction(async (tx) => {
      const created = await tx.deliveryEvent.create({
        data: {
          id: eventId,
          tripId: id,
          orderId: stop.orderId,
          actorId: session.userId,
          kind: input.kind,
          recordedOffline: input.recordedOffline,
          payload: { ...input },
        },
      });
      await tx.tripStop.update({ where: { id: stopId }, data: { deliveredAt: new Date() } });
      await tx.order.update({ where: { id: stop.orderId }, data: { status: input.kind } });
      return created;
    });
    await audit(session.userId, "DELIVERY_RECORDED", "Order", stop.orderId, { ...input, eventId });
    return ok(event, { status: 201 });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to record delivery");
  }
}
