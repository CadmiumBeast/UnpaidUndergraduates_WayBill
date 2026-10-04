import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const schema = z.object({
  unitsReceived: z.number().int().nonnegative(),
  issueKind: z.enum(["MISSING", "DAMAGED", "WRONG_ITEM"]).optional(),
  issueNote: z.string().max(500).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  if (session.role !== "MANAGER") return error("Only store managers can confirm receipt", 403);
  const { id } = await context.params;

  try {
    const input = schema.parse(await jsonBody<unknown>(request));
    const order = await db.order.findUnique({ where: { id } });
    if (!order) return error("Order not found", 404);
    const receipt = await db.$transaction(async (tx) => {
      const created = await tx.receipt.upsert({
        where: { orderId: id },
        create: { orderId: id, ...input },
        update: input,
      });
      await tx.order.update({
        where: { id },
        data: { status: input.unitsReceived < order.units ? "PARTIAL" : "DELIVERED" },
      });
      return created;
    });
    await audit(session.userId, "RECEIPT_CONFIRMED", "Order", id, input);
    return ok(receipt);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to confirm receipt");
  }
}
