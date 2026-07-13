import { prisma } from "@/lib/db";
import { ensureDashboardTables } from "@/lib/ensure-dashboard-tables";

export type ActivityCategory = "mqtt" | "dashboard" | "relay" | "system" | "device";

export async function logActivity(
  category: ActivityCategory | string,
  message: string,
  meta: Record<string, unknown> = {}
) {
  try {
    await ensureDashboardTables();
    await prisma.$executeRaw`
      INSERT INTO activity_logs (category, message, meta)
      VALUES (${category}, ${message.slice(0, 2000)}, ${JSON.stringify(meta)}::jsonb)
    `;
  } catch (err) {
    console.error("[activity-log]", err);
  }
}

export async function listActivityLogs(limit = 50, category?: string, deviceId?: string) {
  await ensureDashboardTables();
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  if (deviceId) {
    return prisma.$queryRaw<
      { id: string; category: string; message: string; meta: unknown; created_at: Date }[]
    >`
      SELECT id, category, message, meta, created_at
      FROM activity_logs
      WHERE meta->>'deviceId' = ${deviceId}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `;
  }

  if (category) {
    return prisma.$queryRaw<
      { id: string; category: string; message: string; meta: unknown; created_at: Date }[]
    >`
      SELECT id, category, message, meta, created_at
      FROM activity_logs
      WHERE category = ${category}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `;
  }

  return prisma.$queryRaw<
    { id: string; category: string; message: string; meta: unknown; created_at: Date }[]
  >`
    SELECT id, category, message, meta, created_at
    FROM activity_logs
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;
}
