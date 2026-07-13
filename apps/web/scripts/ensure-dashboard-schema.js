/**
 * Creates dashboard_layouts / dashboard_widgets if missing.
 * Runs before the Next.js server on container start.
 * Prisma allows only one SQL statement per $executeRawUnsafe call.
 */
const { PrismaClient } = require("@prisma/client");

const STATEMENTS = [
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
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const sql of STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("[ensure-dashboard-schema] dashboard tables OK");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS tab_icon VARCHAR(50) NOT NULL DEFAULT 'layout-dashboard'`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS show_tab_label BOOLEAN NOT NULL DEFAULT TRUE`
    );
    console.log("[ensure-dashboard-schema] dashboard tab columns OK");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true`
    );
    console.log("[ensure-dashboard-schema] devices.is_enabled OK");
  } catch (err) {
    console.error("[ensure-dashboard-schema] failed:", err.message);
    console.error("[ensure-dashboard-schema] web server will still start");
  } finally {
    await prisma.$disconnect();
  }
}

main();
