import { readSession, publicUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { error, ok } from "@/lib/http";

export async function GET() {
  const session = await readSession();
  if (!session) return error("Unauthorized", 401);
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return error("User not found", 401);
  return ok({ user: publicUser(user) });
}
