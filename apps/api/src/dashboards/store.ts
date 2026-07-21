import { getPool } from "../db.js";

export type DashboardRow = {
  id: string;
  owner_user_id: string | null;
  name: string;
  document: {
    schemaVersion: number;
    name: string;
    widgets: unknown[];
  };
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function listDashboards(ownerUserId?: string): Promise<DashboardRow[]> {
  if (ownerUserId) {
    const result = await getPool().query<DashboardRow>(
      `SELECT id, owner_user_id, name, document, is_default, created_at, updated_at
       FROM v3_dashboards
       WHERE owner_user_id IS NULL OR owner_user_id = $1
       ORDER BY is_default DESC, name ASC`,
      [ownerUserId]
    );
    return result.rows;
  }
  const result = await getPool().query<DashboardRow>(
    `SELECT id, owner_user_id, name, document, is_default, created_at, updated_at
     FROM v3_dashboards
     ORDER BY is_default DESC, name ASC`
  );
  return result.rows;
}

export async function getDashboard(id: string): Promise<DashboardRow | null> {
  const result = await getPool().query<DashboardRow>(
    `SELECT id, owner_user_id, name, document, is_default, created_at, updated_at
     FROM v3_dashboards WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createDashboard(input: {
  name: string;
  ownerUserId: string;
  document?: DashboardRow["document"];
}): Promise<DashboardRow> {
  const document = input.document ?? {
    schemaVersion: 1,
    name: input.name,
    widgets: [],
  };
  const result = await getPool().query<DashboardRow>(
    `INSERT INTO v3_dashboards (owner_user_id, name, document)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, owner_user_id, name, document, is_default, created_at, updated_at`,
    [input.ownerUserId, input.name, JSON.stringify(document)]
  );
  return result.rows[0];
}

export async function updateDashboard(
  id: string,
  input: { name?: string; document?: DashboardRow["document"]; isDefault?: boolean }
): Promise<DashboardRow | null> {
  const existing = await getDashboard(id);
  if (!existing) return null;

  const name = input.name ?? existing.name;
  const document = input.document ?? existing.document;
  const isDefault = input.isDefault ?? existing.is_default;

  if (isDefault) {
    await getPool().query(`UPDATE v3_dashboards SET is_default = FALSE WHERE is_default = TRUE`);
  }

  const result = await getPool().query<DashboardRow>(
    `UPDATE v3_dashboards
     SET name = $2, document = $3::jsonb, is_default = $4, updated_at = NOW()
     WHERE id = $1
     RETURNING id, owner_user_id, name, document, is_default, created_at, updated_at`,
    [id, name, JSON.stringify({ ...document, name }), isDefault]
  );
  return result.rows[0] ?? null;
}

export async function deleteDashboard(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM v3_dashboards WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
