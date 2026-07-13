import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getLatestReading } from "@/lib/influx";
import { getMqttSensorValues } from "@/lib/mqtt";

/** ESP32 publishes ~30s; Node-RED → Influx may lag slightly */
const LIVE_THRESHOLD_MS = 120_000;

function isFreshTime(isoTime: string | null | undefined): boolean {
  if (!isoTime) return false;
  return Date.now() - new Date(isoTime).getTime() < LIVE_THRESHOLD_MS;
}

export async function GET() {
  try {
    await requireSession();
    const sensors = await prisma.sensor.findMany({
      where: { isEnabled: true, device: { isEnabled: true } },
      include: { device: { include: { room: true } } },
    });

    const mqttByTopic = await getMqttSensorValues(sensors.map((s) => s.mqttStateTopic));

    const readings = await Promise.all(
      sensors.map(async (sensor) => {
        const entityId = sensor.esphomeEntityId || sensor.slug;
        const mqttReading = mqttByTopic.get(sensor.mqttStateTopic);
        const influxReading = await getLatestReading(sensor.device.slug, entityId);

        const hasLiveMqtt =
          mqttReading != null && !mqttReading.retained && mqttReading.receivedAt != null;
        const influxFresh = isFreshTime(influxReading?.time);

        let latest: number | null = null;
        let updatedAt: string | null = null;
        let source: "mqtt" | "influx" | "retained" | null = null;

        if (hasLiveMqtt) {
          latest = mqttReading!.value;
          updatedAt = mqttReading!.receivedAt;
          source = "mqtt";
        } else if (influxReading) {
          latest = influxReading.value;
          updatedAt = influxReading.time;
          source = "influx";
        } else if (mqttReading) {
          latest = mqttReading.value;
          updatedAt = null;
          source = "retained";
        }

        const isLive = hasLiveMqtt || influxFresh;

        return {
          sensorId: sensor.id,
          name: sensor.name,
          unit: sensor.unit,
          sensorType: sensor.sensorType,
          deviceName: sensor.device.name,
          roomName: sensor.device.room?.name,
          latest,
          updatedAt,
          source,
          isLive,
        };
      })
    );

    return NextResponse.json(readings);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
