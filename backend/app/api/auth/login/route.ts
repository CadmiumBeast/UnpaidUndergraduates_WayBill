import { NextResponse } from "next/server";
import { z } from "zod";
import { login, publicUser, SESSION_COOKIE } from "@/lib/auth";
import { error, jsonBody } from "@/lib/http";

const schema = z.object({
  username: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/, "PIN must contain four digits"),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await jsonBody<unknown>(request));
    const result = await login(input.username, input.pin);
    if (!result) return error("Invalid staff ID or PIN", 401);

    const response = NextResponse.json({ data: { user: publicUser(result.user) } });
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Invalid request");
  }
}
