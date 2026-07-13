import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getSpeedTestResult } from "@/lib/speed-test";

export const dynamic = "force-dynamic";

/** Server internet speed + external IP (tests run from the Nexternel host). */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const raw = req.nextUrl.searchParams.get("intervalMinutes");
    const intervalMinutes = raw ? Number(raw) : 3;
    const result = await getSpeedTestResult(intervalMinutes);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
