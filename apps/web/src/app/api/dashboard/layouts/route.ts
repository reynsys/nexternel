import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listLayoutSummaries } from "@/lib/dashboard-layout-queries";
import { ensureDashboardTables } from "@/lib/ensure-dashboard-tables";

export async function GET() {
  try {
    await requireSession();
    const layouts = await listLayoutSummaries();
    return NextResponse.json(layouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[layouts GET]", message);
    return NextResponse.json({ error: "Failed to load dashboards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    await ensureDashboardTables();
    const body = await request.json();
    const name = (body.name as string)?.trim() || "New dashboard";

    const layout = await prisma.dashboardLayout.create({
      data: {
        name,
        columns: 4,
        rows: 4,
        isDefault: false,
      },
    });

    return NextResponse.json({
      id: layout.id,
      name: layout.name,
      isDefault: layout.isDefault,
      tabIcon: layout.tabIcon ?? "layout-dashboard",
      showTabLabel: layout.showTabLabel ?? true,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create dashboard" }, { status: 500 });
  }
}
