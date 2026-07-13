import { prisma } from "@/lib/db";

const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL DEFAULT 'default',
    columns     INT NOT NULL DEFAULT 4 CHECK (columns >= 1 AND columns <= 12),
    rows        INT NOT NULL DEFAULT 4 CHECK (rows >= 1 AND rows <= 12),
    is_default  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id   UUID NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(150),
    cell        VARCHAR(10) NOT NULL,
    col_span    INT NOT NULL DEFAULT 1 CHECK (col_span >= 1),
    row_span    INT NOT NULL DEFAULT 1 CHECK (row_span >= 1),
    config      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_layout ON dashboard_widgets(layout_id)`,
  `ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS tab_icon VARCHAR(50) NOT NULL DEFAULT 'layout-dashboard'`,
  `ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS show_tab_label BOOLEAN NOT NULL DEFAULT TRUE`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    VARCHAR(50) NOT NULL,
    message     TEXT NOT NULL,
    meta        JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)`,
];

let tablesReady: Promise<void> | null = null;

/** Create dashboard tables/columns if missing (safe to call repeatedly). */
export function ensureDashboardTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      for (const sql of TABLE_STATEMENTS) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((err) => {
      tablesReady = null;
      console.error("[ensure-dashboard-tables]", err);
      throw err;
    });
  }
  return tablesReady;
}
