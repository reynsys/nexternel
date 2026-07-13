import { InfluxDB, Point } from "@influxdata/influxdb-client";

const url = process.env.INFLUXDB_URL || "http://influxdb:8086";
const token = process.env.INFLUXDB_TOKEN || "";
const org = process.env.INFLUXDB_ORG || "damnhome";
const bucket = process.env.INFLUXDB_BUCKET || "sensors";

export function getInfluxDB() {
  return new InfluxDB({ url, token });
}

export interface ReadingPoint {
  time: string;
  value: number;
}

export interface LatestReading {
  value: number;
  time: string;
}

export async function getLatestReading(
  deviceSlug: string,
  entityId: string
): Promise<LatestReading | null> {
  const queryApi = getInfluxDB().getQueryApi(org);
  const flux = `
    from(bucket: "${bucket}")
      |> range(start: -24h)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.device == "${deviceSlug}")
      |> filter(fn: (r) => r.entity_id == "${entityId}")
      |> filter(fn: (r) => r._field == "value")
      |> last()
  `;

  return new Promise((resolve) => {
    let result: LatestReading | null = null;
    queryApi.queryRows(flux, {
      next(row, tableMeta) {
        const record = tableMeta.toObject(row);
        result = {
          value: record._value as number,
          time: record._time as string,
        };
      },
      error() {
        resolve(null);
      },
      complete() {
        resolve(result);
      },
    });
  });
}

export async function getReadingHistory(
  deviceSlug: string,
  entityId: string,
  hours = 24
): Promise<ReadingPoint[]> {
  const queryApi = getInfluxDB().getQueryApi(org);
  const flux = `
    from(bucket: "${bucket}")
      |> range(start: -${hours}h)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.device == "${deviceSlug}")
      |> filter(fn: (r) => r.entity_id == "${entityId}")
      |> filter(fn: (r) => r._field == "value")
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  `;

  const points: ReadingPoint[] = [];

  return new Promise((resolve) => {
    queryApi.queryRows(flux, {
      next(row, tableMeta) {
        const record = tableMeta.toObject(row);
        points.push({
          time: record._time as string,
          value: Math.round((record._value as number) * 10) / 10,
        });
      },
      error() {
        resolve(points);
      },
      complete() {
        resolve(points);
      },
    });
  });
}

export { Point };
