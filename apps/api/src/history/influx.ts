import { InfluxDB } from "@influxdata/influxdb-client";
import { config } from "../config.js";

export type HistoryPoint = { t: string; v: number };

export type HistoryRange = "1h" | "6h" | "24h" | "7d";

const RANGE_CONFIG: Record<
  HistoryRange,
  { fluxStart: string; aggregateEvery: string }
> = {
  "1h": { fluxStart: "-1h", aggregateEvery: "1m" },
  "6h": { fluxStart: "-6h", aggregateEvery: "1m" },
  "24h": { fluxStart: "-24h", aggregateEvery: "1m" },
  "7d": { fluxStart: "-7d", aggregateEvery: "5m" },
};

/** Allow only safe tag characters in Flux string literals. */
export function sanitizeInfluxTag(value: string): string {
  if (!/^[a-zA-Z0-9_.:\-]+$/.test(value)) {
    throw new Error(`Invalid Influx tag value: ${value}`);
  }
  return value;
}

export function isHistoryRange(value: string): value is HistoryRange {
  return value === "1h" || value === "6h" || value === "24h" || value === "7d";
}

export function rangeMeta(range: HistoryRange) {
  return RANGE_CONFIG[range];
}

function getQueryApi() {
  const { url, token, org } = config.influx();
  return new InfluxDB({ url, token }).getQueryApi(org);
}

/**
 * Read-only history from existing Node-RED writes
 * (measurement sensor_reading, tags device + entity_id, field value).
 */
export async function querySensorHistory(
  deviceSlug: string,
  entityId: string,
  range: HistoryRange
): Promise<{ points: HistoryPoint[]; aggregateEvery: string }> {
  const device = sanitizeInfluxTag(deviceSlug);
  const entity = sanitizeInfluxTag(entityId);
  const { fluxStart, aggregateEvery } = RANGE_CONFIG[range];
  const { bucket } = config.influx();

  const flux = `
    from(bucket: "${bucket}")
      |> range(start: ${fluxStart})
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.device == "${device}")
      |> filter(fn: (r) => r.entity_id == "${entity}")
      |> filter(fn: (r) => r._field == "value")
      |> aggregateWindow(every: ${aggregateEvery}, fn: mean, createEmpty: false)
  `;

  const points: HistoryPoint[] = [];
  const queryApi = getQueryApi();

  await new Promise<void>((resolve, reject) => {
    queryApi.queryRows(flux, {
      next(row, tableMeta) {
        const record = tableMeta.toObject(row);
        const raw = record._value;
        const v = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(v)) return;
        points.push({
          t: String(record._time),
          v: Math.round(v * 10) / 10,
        });
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve();
      },
    });
  });

  return { points, aggregateEvery };
}
