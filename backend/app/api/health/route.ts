import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "waybill-api", database: "up" });
  } catch {
    return NextResponse.json(
      { ok: false, service: "waybill-api", database: "down" },
      { status: 503 },
    );
  }
}
