import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const schema = z.object({ reason: z.string().min(3) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "DISPATCHER") return error("Only dispatchers can defer orders", 403);
  const { id } = await context.params;

  try {
    const { reason } = schema.parse(await jsonBody<unknown>(request));
    const order = await db.order.update({
      where: { id },
      data: { status: "DEFERRED", deferredReason: reason, deferredAt: new Date(), planVersion: { increment: 1 } },
      include: { outlet: true },
    });
    await audit(session.userId, "ORDER_DEFERRED", "Order", id, { reason });
    return ok(order);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to defer order");
  }
}
