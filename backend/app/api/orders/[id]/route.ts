import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { error, ok } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const { id } = await context.params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      outlet: true,
      tripStop: { include: { trip: { include: { vehicle: true, plan: true } } } },
      deliveryEvents: { orderBy: { createdAt: "asc" } },
      receipt: true,
      syncEvents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return error("Order not found", 404);
  return ok(order);
}
