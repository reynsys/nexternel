import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { reflowAllWidgets } from "@/lib/grid";

/** POST /api/dashboard/layout/reflow — repack widgets to remove overlaps */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const layoutId = body.layoutId as string | undefined;

    if (!layoutId) {
      return NextResponse.json({ error: "layoutId is required" }, { status: 400 });
    }

    const layout = await prisma.dashboardLayout.findUnique({ where: { id: layoutId } });
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    const widgets = await prisma.dashboardWidget.findMany({ where: { layoutId } });
    const reflow = reflowAllWidgets(
      layout.columns,
      layout.rows,
      widgets.map((w) => ({
        id: w.id,
        cell: w.cell,
        colSpan: w.colSpan,
        rowSpan: w.rowSpan,
      }))
    );

    if ("error" in reflow) {
      return NextResponse.json({ error: reflow.error }, { status: 400 });
    }

    await prisma.$transaction(
      reflow.updates.map((u) =>
        prisma.dashboardWidget.update({
          where: { id: u.id },
          data: { cell: u.cell },
        })
      )
    );

    return NextResponse.json({ ok: true, shifted: reflow.updates });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
