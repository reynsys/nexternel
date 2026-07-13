import { prisma } from "@/lib/db";
import { ensureDashboardTables } from "@/lib/ensure-dashboard-tables";
import type { DashboardLayoutSummary } from "@/types/dashboard";

const DEFAULT_TAB_ICON = "layout-dashboard";

type RawLayoutRow = {
  id: string;
  name: string;
  is_default: boolean;
  tab_icon?: string | null;
  show_tab_label?: boolean | null;
};

function toSummary(layout: {
  id: string;
  name: string;
  isDefault: boolean;
  tabIcon?: string | null;
  showTabLabel?: boolean | null;
}): DashboardLayoutSummary {
  return {
    id: layout.id,
    name: layout.name,
    isDefault: layout.isDefault,
    tabIcon: layout.tabIcon ?? DEFAULT_TAB_ICON,
    showTabLabel: layout.showTabLabel ?? true,
  };
}

function rawToSummary(row: RawLayoutRow): DashboardLayoutSummary {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    tabIcon: row.tab_icon ?? DEFAULT_TAB_ICON,
    showTabLabel: row.show_tab_label ?? true,
  };
}

async function listViaRawSql(includeTabColumns: boolean): Promise<DashboardLayoutSummary[]> {
  if (includeTabColumns) {
    const rows = await prisma.$queryRawUnsafe<RawLayoutRow[]>(
      `SELECT id, name, is_default, tab_icon, show_tab_label
       FROM dashboard_layouts
       ORDER BY is_default DESC, created_at ASC`
    );
    return rows.map(rawToSummary);
  }

  const rows = await prisma.$queryRawUnsafe<RawLayoutRow[]>(
    `SELECT id, name, is_default
     FROM dashboard_layouts
     ORDER BY is_default DESC, created_at ASC`
  );
  return rows.map(rawToSummary);
}

/** List dashboard tabs; ensures tables exist and falls back across schema versions. */
export async function listLayoutSummaries(): Promise<DashboardLayoutSummary[]> {
  await ensureDashboardTables();

  try {
    const layouts = await prisma.dashboardLayout.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isDefault: true, tabIcon: true, showTabLabel: true },
    });
    return layouts.map(toSummary);
  } catch (err) {
    console.warn("[dashboard layouts] Prisma full select failed:", err);
  }

  try {
    const layouts = await prisma.dashboardLayout.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isDefault: true },
    });
    return layouts.map((l) => toSummary(l));
  } catch (err) {
    console.warn("[dashboard layouts] Prisma basic select failed:", err);
  }

  try {
    return await listViaRawSql(true);
  } catch (err) {
    console.warn("[dashboard layouts] raw SQL with tab columns failed:", err);
    return await listViaRawSql(false);
  }
}

export async function updateLayoutSummary(
  id: string,
  data: { name?: string; tabIcon?: string; showTabLabel?: boolean }
): Promise<DashboardLayoutSummary> {
  await ensureDashboardTables();

  try {
    const updated = await prisma.dashboardLayout.update({
      where: { id },
      data,
      select: { id: true, name: true, isDefault: true, tabIcon: true, showTabLabel: true },
    });
    return toSummary(updated);
  } catch (err) {
    if (!data.name) throw err;
    console.warn("[dashboard layouts] tab column update failed, saving name only:", err);
    const updated = await prisma.dashboardLayout.update({
      where: { id },
      data: { name: data.name },
      select: { id: true, name: true, isDefault: true },
    });
    return toSummary(updated);
  }
}
