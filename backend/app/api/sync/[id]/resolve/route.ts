import { z } from "zod";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { error, jsonBody, ok } from "@/lib/http";

const schema = z.object({ resolution: z.enum(["KEEP_DRIVER_RECORD", "ACCEPT_SERVER_PLAN"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const { id } = await context.params;
  const input = schema.parse(await jsonBody<unknown>(request));
  const syncEvent = await db.syncEvent.findUnique({ where: { id } });
  if (!syncEvent) return error("Sync conflict not found", 404);
  if (syncEvent.actorId !== session.userId && session.role !== "DISPATCHER") return error("Not allowed to resolve this conflict", 403);

  const resolved = await db.syncEvent.update({ where: { id }, data: { status: "RESOLVED", resolution: input.resolution, resolvedAt: new Date() } });
  await audit(session.userId, "SYNC_CONFLICT_RESOLVED", "SyncEvent", id, input);
  return ok(resolved);
}
