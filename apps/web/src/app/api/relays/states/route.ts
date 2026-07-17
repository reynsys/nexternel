import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lightweight relay ON/OFF snapshot for live dashboard sync across browsers. */
export async function GET() {
  try {
    await requireSession();
    const relays = await prisma.relay.findMany({
      select: { id: true, lastState: true },
    });
    return NextResponse.json(relays);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
