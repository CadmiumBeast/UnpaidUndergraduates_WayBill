import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const createOrderSchema = z.object({
  temp: z.enum(["CHILLED", "AMBIENT"]),
  units: z.number().int().positive(),
  weightKg: z.number().positive(),
  volumeM3: z.number().positive(),
  afterCutoff: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  const user = await db.user.findUnique({ where: { id: session.userId } });
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(session.role === "MANAGER" && user?.outletId ? { outletId: user.outletId } : {}),
    },
    include: { outlet: true, tripStop: { include: { trip: true } }, receipt: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(orders);
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "MANAGER") return error("Only store managers can place orders", 403);

  try {
    const input = createOrderSchema.parse(await jsonBody<unknown>(request));
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user?.outletId) return error("This account is not linked to an outlet", 422);
    const outlet = await db.outlet.findUnique({ where: { id: user.outletId } });
    if (!outlet) return error("Outlet not found", 404);

    const ref = `ORD-${Date.now().toString().slice(-8)}`;
    const order = await db.order.create({
      data: {
        ref,
        outletId: outlet.id,
        brand: outlet.brand,
        district: outlet.district,
        depot: outlet.depot,
        temp: input.temp,
        units: input.units,
        weightKg: input.weightKg,
        volumeM3: input.volumeM3,
        status: input.afterCutoff ? "NEXT_RUN" : "CONFIRMED",
        handoffCode: Math.floor(1000 + Math.random() * 9000).toString(),
      },
      include: { outlet: true },
    });
    await audit(session.userId, "ORDER_PLACED", "Order", order.id, { afterCutoff: input.afterCutoff });
    return ok(order, { status: 201 });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Invalid order");
  }
}
