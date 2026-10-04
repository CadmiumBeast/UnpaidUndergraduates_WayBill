import type { Prisma } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { error, jsonBody, ok } from "@/lib/http";

const STATE_ID = "waybill-shared-world";

export async function GET() {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const state = await db.worldState.findUnique({ where: { id: STATE_ID } });
  return ok(state ? { version: state.version, state: state.state } : null);
}

export async function PUT(request: Request) {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);

  try {
    const body = (await jsonBody<unknown>(request)) as { state?: unknown; version?: number };
    if (!body.state || typeof body.state !== "object") return error("state is required");

    const current = await db.worldState.findUnique({ where: { id: STATE_ID } });
    if (current && typeof body.version === "number" && body.version < current.version) {
      return ok({ version: current.version, state: current.state, conflict: true }, { status: 409 });
    }

    const next = await db.worldState.upsert({
      where: { id: STATE_ID },
      create: { id: STATE_ID, version: 1, state: body.state as Prisma.InputJsonValue },
      update: { version: { increment: 1 }, state: body.state as Prisma.InputJsonValue },
    });
    return ok({ version: next.version, state: next.state, updatedBy: session.username });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to save shared state");
  }
}
