import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { error, ok } from "@/lib/http";

export async function GET() {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const user = await db.user.findUnique({ where: { id: session.userId } });
  const trips = await db.trip.findMany({
    where: {
      ...(session.role === "DRIVER" && user?.vehicleId ? { vehicleId: user.vehicleId } : {}),
      ...(session.role === "LOADER" && user?.depot ? { depot: user.depot } : {}),
    },
    include: { vehicle: true, plan: true, stops: { orderBy: { stopNumber: "asc" }, include: { order: { include: { outlet: true, receipt: true } } } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return ok(trips);
}
