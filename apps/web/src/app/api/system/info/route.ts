import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getSystemStats } from "@/lib/system-stats";

export async function GET() {
  try {
    await requireSession();
    return NextResponse.json(await getSystemStats());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
