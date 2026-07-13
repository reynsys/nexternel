import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { cellFitsGrid, reflowOnInsertAtCell } from "@/lib/grid";
import { logActivity } from "@/lib/activity-log";
import { validateWidgetConfigPlatform } from "@/widget-platform/schema/instance";
import type { WidgetConfig, WidgetType } from "@/types/dashboard";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const { type, title, cell: requestedCell, colSpan = 1, rowSpan = 1, config = {}, layoutId } = body;

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const platformError = validateWidgetConfigPlatform(config as WidgetConfig);
    if (platformError) {
      return NextResponse.json({ error: platformError }, { status: 400 });
    }

    let targetLayoutId = layoutId as string | undefined;
    if (!targetLayoutId) {
      const defaultLayout = await prisma.dashboardLayout.findFirst({
        where: { isDefault: true },
      });
      targetLayoutId = defaultLayout?.id;
    }
    if (!targetLayoutId) {
      return NextResponse.json({ error: "No dashboard layout" }, { status: 404 });
    }

    const layout = await prisma.dashboardLayout.findUnique({ where: { id: targetLayoutId } });
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    const existing = await prisma.dashboardWidget.findMany({
      where: { layoutId: targetLayoutId },
    });

    const targetCell =
      typeof requestedCell === "string" && requestedCell.trim()
        ? requestedCell.trim().toUpperCase()
        : "A1";

    const reflow = reflowOnInsertAtCell(
      layout.columns,
      layout.rows,
      existing.map((w) => ({
        id: w.id,
        cell: w.cell,
        colSpan: w.colSpan,
        rowSpan: w.rowSpan,
      })),
      colSpan,
      rowSpan,
      targetCell
    );

    if ("error" in reflow) {
      return NextResponse.json({ error: reflow.error }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const u of reflow.updates) {
        await tx.dashboardWidget.update({
          where: { id: u.id },
          data: { cell: u.cell },
        });
      }

      const widget = await tx.dashboardWidget.create({
        data: {
          layoutId: targetLayoutId!,
          type: type as WidgetType,
          title: title || null,
          cell: reflow.newCell,
          colSpan,
          rowSpan,
          config,
        },
      });

      return widget;
    });

    await logActivity("dashboard", `Widget added: ${type}`, { widgetId: result.id, type });

    return NextResponse.json({
      id: result.id,
      type: result.type,
      title: result.title,
      cell: result.cell,
      colSpan: result.colSpan,
      rowSpan: result.rowSpan,
      config: result.config as WidgetConfig,
      shifted: reflow.updates,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
