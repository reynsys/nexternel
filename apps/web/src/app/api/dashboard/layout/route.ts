import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { buildDefaultWidgets } from "@/lib/dashboard-defaults";
import { ensureDashboardTables } from "@/lib/ensure-dashboard-tables";
import { cellFitsGrid } from "@/lib/grid";
import type { DashboardLayoutDto, WidgetConfig } from "@/types/dashboard";

function serializeLayout(layout: {
  id: string;
  name: string;
  columns: number;
  rows: number;
  widgets: {
    id: string;
    type: string;
    title: string | null;
    cell: string;
    colSpan: number;
    rowSpan: number;
    config: unknown;
  }[];
}): DashboardLayoutDto {
  return {
    id: layout.id,
    name: layout.name,
    columns: layout.columns,
    rows: layout.rows,
    widgets: layout.widgets.map((w) => ({
      id: w.id,
      type: w.type as DashboardLayoutDto["widgets"][0]["type"],
      title: w.title,
      cell: w.cell,
      colSpan: w.colSpan,
      rowSpan: w.rowSpan,
      config: (w.config as WidgetConfig) || {},
    })),
  };
}

async function getOrCreateDefaultLayout() {
  let layout = await prisma.dashboardLayout.findFirst({
    where: { isDefault: true },
    include: { widgets: true },
  });

  if (layout) return layout;

  const [sensors, relays] = await Promise.all([
    prisma.sensor.findMany({
      where: { isEnabled: true },
      include: { device: { include: { room: true } } },
    }),
    prisma.relay.findMany({ where: { isEnabled: true } }),
  ]);

  const columns = 4;
  const rows = 4;
  const widgetData = buildDefaultWidgets(sensors, relays, columns, rows);

  layout = await prisma.dashboardLayout.create({
    data: {
      name: "Main",
      columns,
      rows,
      isDefault: true,
      widgets: { create: widgetData },
    },
    include: { widgets: true },
  });

  return layout;
}

async function resolveLayout(layoutId: string | null) {
  if (layoutId) {
    const layout = await prisma.dashboardLayout.findUnique({
      where: { id: layoutId },
      include: { widgets: true },
    });
    if (layout) return layout;
  }
  return getOrCreateDefaultLayout();
}

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    await ensureDashboardTables();
    const layoutId = request.nextUrl.searchParams.get("layoutId");
    const layout = await resolveLayout(layoutId);
    return NextResponse.json(serializeLayout(layout));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[dashboard/layout GET]", message);
    return NextResponse.json(
      { error: "Dashboard database error — rebuild web container after upload" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const { columns, rows, layoutId } = body;

    if (!columns || !rows || columns < 1 || columns > 12 || rows < 1 || rows > 12) {
      return NextResponse.json({ error: "columns and rows must be 1–12" }, { status: 400 });
    }

    const layout = await resolveLayout(layoutId ?? null);

    const invalid = layout.widgets.filter(
      (w) => !cellFitsGrid(w.cell, w.colSpan, w.rowSpan, columns, rows)
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Shrink grid first — widget(s) at ${invalid.map((w) => w.cell).join(", ")} would be out of bounds`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.dashboardLayout.update({
      where: { id: layout.id },
      data: { columns, rows },
      include: { widgets: true },
    });

    return NextResponse.json(serializeLayout(updated));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
