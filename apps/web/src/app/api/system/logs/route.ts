import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listActivityLogs, logActivity } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
    const category = request.nextUrl.searchParams.get("category") || undefined;
    const rows = await listActivityLogs(limit, category);

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        category: r.category,
        message: r.message,
        meta: r.meta,
        createdAt: r.created_at,
      }))
    );
  } catch (err) {
    console.error("[system/logs GET]", err);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const category = String(body.category || "dashboard");
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    await logActivity(category, message, {
      ...(body.meta || {}),
      username: session.username,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
