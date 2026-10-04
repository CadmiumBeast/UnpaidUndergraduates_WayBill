import { db } from "@/lib/db";

export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  payload?: unknown,
) {
  await db.auditLog.create({
    data: { actorId, action, entity, entityId, payload: payload as object | undefined },
  });
}
