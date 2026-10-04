import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const eventSchema = z.object({
  id: z.string().min(8),
  orderId: z.string().min(1),
  tripId: z.string().min(1),
  deviceId: z.string().min(1),
  planVersion: z.number().int().nonnegative(),
  action: z.enum(["DELIVERY_OUTCOME", "PROBLEM"]),
  payload: z.record(z.string(), z.unknown()),
});

const schema = z.object({ events: z.array(eventSchema).max(100) });

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "DRIVER") return error("Only drivers can synchronize delivery events", 403);

  try {
    const { events } = schema.parse(await jsonBody<unknown>(request));
    const result: Array<{ id: string; status: "APPLIED" | "CONFLICT"; reason?: string }> = [];
    for (const item of events) {
      const existing = await db.syncEvent.findUnique({ where: { id: item.id } });
      if (existing) {
        result.push({ id: item.id, status: existing.status === "CONFLICT" ? "CONFLICT" : "APPLIED" });
        continue;
      }
      const order = await db.order.findUnique({ where: { id: item.orderId } });
      if (!order) {
        result.push({ id: item.id, status: "CONFLICT", reason: "Order no longer exists" });
        continue;
      }
      if (order.planVersion > item.planVersion) {
        await db.syncEvent.create({
          data: { id: item.id, orderId: item.orderId, actorId: session.userId, deviceId: item.deviceId, planVersion: item.planVersion, action: item.action, payload: item.payload as Prisma.InputJsonValue, status: "CONFLICT" },
        });
        result.push({ id: item.id, status: "CONFLICT", reason: "The plan changed while this device was offline" });
        continue;
      }
      await db.$transaction(async (tx) => {
        await tx.syncEvent.create({
          data: { id: item.id, orderId: item.orderId, actorId: session.userId, deviceId: item.deviceId, planVersion: item.planVersion, action: item.action, payload: item.payload as Prisma.InputJsonValue, status: "APPLIED" },
        });
        if (item.action === "DELIVERY_OUTCOME") {
          const kind = typeof item.payload.kind === "string" ? item.payload.kind : "FAILED";
          await tx.order.update({ where: { id: item.orderId }, data: { status: kind as never } });
          await tx.deliveryEvent.create({
            data: { id: `${item.id}:delivery`, tripId: item.tripId, orderId: item.orderId, actorId: session.userId, kind, payload: item.payload as Prisma.InputJsonValue, recordedOffline: true },
          });
        }
      });
      result.push({ id: item.id, status: "APPLIED" });
    }
    await audit(session.userId, "OFFLINE_EVENTS_SYNCED", "Sync", session.userId, { count: events.length });
    return ok({ results: result });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to synchronize events");
  }
}
