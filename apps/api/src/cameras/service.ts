import { getPool } from "../db.js";
import {
  go2rtcDeleteStream,
  go2rtcPutStream,
  playUrlsForStream,
} from "./go2rtc.js";
import { normalizeStreamId } from "./presets.js";

export type CameraRow = {
  id: string;
  name: string;
  stream_id: string;
  rtsp_url: string;
  area_id: string | null;
  area_name: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type CameraPublic = {
  id: string;
  name: string;
  streamId: string;
  areaId: string | null;
  areaName: string | null;
  enabled: boolean;
  sortOrder: number;
  hasRtspUrl: boolean;
  /** Present only when the caller may edit devices (Cameras admin). */
  rtspUrl?: string;
};

function mapPublic(r: CameraRow, includeRtspUrl = false): CameraPublic {
  return {
    id: r.id,
    name: r.name,
    streamId: r.stream_id,
    areaId: r.area_id,
    areaName: r.area_name,
    enabled: r.enabled,
    sortOrder: r.sort_order,
    hasRtspUrl: Boolean(r.rtsp_url?.trim()),
    ...(includeRtspUrl ? { rtspUrl: r.rtsp_url } : {}),
  };
}

const SELECT_SQL = `
  SELECT c.id, c.name, c.stream_id, c.rtsp_url, c.area_id, c.enabled, c.sort_order,
         c.created_at, c.updated_at,
         r.name AS area_name
  FROM cameras c
  LEFT JOIN rooms r ON r.id = c.area_id
`;

export async function listCameras(
  includeRtspUrl = false
): Promise<CameraPublic[]> {
  const result = await getPool().query<CameraRow>(
    `${SELECT_SQL} ORDER BY c.sort_order ASC, c.name ASC`
  );
  return result.rows.map((r) => mapPublic(r, includeRtspUrl));
}

export async function getCamera(
  id: string,
  includeRtspUrl = false
): Promise<CameraPublic | null> {
  const result = await getPool().query<CameraRow>(
    `${SELECT_SQL} WHERE c.id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? mapPublic(row, includeRtspUrl) : null;
}

async function getCameraRow(id: string): Promise<CameraRow | null> {
  const result = await getPool().query<CameraRow>(
    `${SELECT_SQL} WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export type CreateCameraInput = {
  name: string;
  streamId: string;
  rtspUrl: string;
  areaId?: string | null;
  enabled?: boolean;
  sortOrder?: number;
};

export async function createCamera(
  input: CreateCameraInput
): Promise<CameraPublic> {
  const streamId = normalizeStreamId(input.streamId);
  if (!streamId) {
    throw Object.assign(new Error("streamId is required"), { code: "validation" });
  }
  const rtspUrl = input.rtspUrl.trim();
  if (!rtspUrl.toLowerCase().startsWith("rtsp://")) {
    throw Object.assign(new Error("rtspUrl must start with rtsp://"), {
      code: "validation",
    });
  }
  const name = input.name.trim();
  if (!name) {
    throw Object.assign(new Error("name is required"), { code: "validation" });
  }

  const inserted = await getPool().query<{ id: string }>(
    `INSERT INTO cameras (name, stream_id, rtsp_url, area_id, enabled, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      name,
      streamId,
      rtspUrl,
      input.areaId ?? null,
      input.enabled !== false,
      input.sortOrder ?? 0,
    ]
  );
  const id = inserted.rows[0]!.id;

  try {
    if (input.enabled !== false) {
      await go2rtcPutStream(streamId, rtspUrl);
    }
  } catch (err) {
    await getPool().query(`DELETE FROM cameras WHERE id = $1`, [id]);
    throw err;
  }

  const cam = await getCamera(id, true);
  return cam!;
}

export type UpdateCameraInput = {
  name?: string;
  streamId?: string;
  /** Omit or empty = keep existing */
  rtspUrl?: string;
  areaId?: string | null;
  enabled?: boolean;
  sortOrder?: number;
};

export async function updateCamera(
  id: string,
  input: UpdateCameraInput
): Promise<CameraPublic | null> {
  const existing = await getCameraRow(id);
  if (!existing) return null;

  const name =
    typeof input.name === "string" && input.name.trim()
      ? input.name.trim()
      : existing.name;
  const nextStreamId =
    typeof input.streamId === "string" && input.streamId.trim()
      ? normalizeStreamId(input.streamId)
      : existing.stream_id;
  if (!nextStreamId) {
    throw Object.assign(new Error("streamId is required"), { code: "validation" });
  }
  const rtspUrl =
    typeof input.rtspUrl === "string" && input.rtspUrl.trim()
      ? input.rtspUrl.trim()
      : existing.rtsp_url;
  if (!rtspUrl.toLowerCase().startsWith("rtsp://")) {
    throw Object.assign(new Error("rtspUrl must start with rtsp://"), {
      code: "validation",
    });
  }
  const areaId =
    input.areaId === undefined ? existing.area_id : input.areaId;
  const enabled =
    typeof input.enabled === "boolean" ? input.enabled : existing.enabled;
  const sortOrder =
    typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : existing.sort_order;

  await getPool().query(
    `UPDATE cameras
     SET name = $2, stream_id = $3, rtsp_url = $4, area_id = $5,
         enabled = $6, sort_order = $7, updated_at = NOW()
     WHERE id = $1`,
    [id, name, nextStreamId, rtspUrl, areaId, enabled, sortOrder]
  );

  if (existing.stream_id !== nextStreamId) {
    try {
      await go2rtcDeleteStream(existing.stream_id);
    } catch {
      /* ignore */
    }
  }

  if (enabled) {
    await go2rtcPutStream(nextStreamId, rtspUrl);
  } else {
    await go2rtcDeleteStream(nextStreamId);
  }

  return getCamera(id, true);
}

export async function deleteCamera(id: string): Promise<boolean> {
  const existing = await getCameraRow(id);
  if (!existing) return false;
  await getPool().query(`DELETE FROM cameras WHERE id = $1`, [id]);
  try {
    await go2rtcDeleteStream(existing.stream_id);
  } catch {
    /* ignore */
  }
  return true;
}

export async function getCameraPlay(id: string): Promise<{
  id: string;
  name: string;
  streamId: string;
  hlsUrl: string;
  mseUrl: string;
  enabled: boolean;
} | null> {
  const row = await getCameraRow(id);
  if (!row) return null;
  const urls = playUrlsForStream(row.stream_id);
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    ...urls,
  };
}

/** Re-push all enabled cameras to go2rtc (startup / recovery). */
export async function syncAllCamerasToGo2rtc(): Promise<{
  synced: number;
  errors: string[];
}> {
  const result = await getPool().query<{
    stream_id: string;
    rtsp_url: string;
    name: string;
  }>(
    `SELECT stream_id, rtsp_url, name FROM cameras WHERE enabled = TRUE`
  );
  let synced = 0;
  const errors: string[] = [];
  for (const row of result.rows) {
    try {
      await go2rtcPutStream(row.stream_id, row.rtsp_url);
      synced += 1;
    } catch (err) {
      errors.push(
        `${row.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return { synced, errors };
}
