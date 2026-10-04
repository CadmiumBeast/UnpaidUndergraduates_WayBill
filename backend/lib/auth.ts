import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "waybill_session";

type Session = {
  userId: string;
  role: "DISPATCHER" | "LOADER" | "DRIVER" | "MANAGER";
  username: string;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(value);
}

export async function createSession(user: Session) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role as Session["role"],
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await readSession();
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

export async function login(username: string, pin: string) {
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !(await compare(pin, user.pinHash))) return null;

  const token = await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return { token, user };
}

export function publicUser(user: {
  id: string;
  username: string;
  name: string;
  role: string;
  title: string;
  depot: string | null;
  vehicleId: string | null;
  outletId: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role.toLowerCase(),
    title: user.title,
    depot: user.depot,
    vehicleId: user.vehicleId,
    outletId: user.outletId,
  };
}
