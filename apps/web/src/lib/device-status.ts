import { prisma } from "@/lib/db";
import { getMqttRelayStates, getMqttSensorValues } from "@/lib/mqtt";
import { getLatestReading } from "@/lib/influx";
import { formatLastSeen, esphomeDashboardUrl } from "@/lib/device-utils";

export { formatLastSeen, esphomeDashboardUrl };

/** ESP32 publishes ~30s; Node-RED → Influx may lag slightly */
const LIVE_THRESHOLD_MS = 120_000;

function isFreshTime(isoTime: string | null | undefined): boolean {
  if (!isoTime) return false;
  return Date.now() - new Date(isoTime).getTime() < LIVE_THRESHOLD_MS;
}

function pickLatestSeen(...candidates: (string | Date | null | undefined)[]): Date | null {
  let latest: Date | null = null;
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

/** Poll MQTT + Influx for this device's sensors and update is_online / last_seen_at. */
export async function refreshDeviceOnlineStatus(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      sensors: { where: { isEnabled: true } },
      relays: { where: { isEnabled: true } },
    },
  });
  if (!device) return null;

  const mqttByTopic = await getMqttSensorValues(device.sensors.map((s) => s.mqttStateTopic));
  const relayByTopic = await getMqttRelayStates(device.relays.map((r) => r.mqttStateTopic));

  // If registered topics are silent, scan the device prefix on the broker
  if (device.relays.length > 0 && device.mqttTopicPrefix) {
    const prefix = device.mqttTopicPrefix.replace(/\/+$/, "");
    const { probeMqttPrefix, discoverSwitchEntitiesFromProbe } = await import("@/lib/mqtt");
    const probe = await probeMqttPrefix(prefix, 2000);
    if (probe.size > 0) {
      const discovered = discoverSwitchEntitiesFromProbe(prefix, probe);
      for (const d of discovered) {
        const relay = device.relays.find((r) => r.mqttStateTopic === d.stateTopic);
        if (relay && d.state && relay.lastState !== d.state) {
          await prisma.relay.update({
            where: { id: relay.id },
            data: { lastState: d.state },
          });
        }
      }
    }
  }

  let anyLive = false;
  let latestSeen: Date | null = null;

  for (const sensor of device.sensors) {
    const entityId = sensor.esphomeEntityId || sensor.slug;
    const mqtt = mqttByTopic.get(sensor.mqttStateTopic);
    const influx = await getLatestReading(device.slug, entityId);

    const hasLiveMqtt =
      mqtt != null && !mqtt.retained && mqtt.receivedAt != null && isFreshTime(mqtt.receivedAt);
    const influxFresh = isFreshTime(influx?.time);
    const sensorLive = hasLiveMqtt || influxFresh;

    if (sensorLive) {
      anyLive = true;
      latestSeen = pickLatestSeen(
        latestSeen,
        hasLiveMqtt ? mqtt?.receivedAt : null,
        influxFresh ? influx?.time : null
      );
    }
  }

  for (const relay of device.relays) {
    const mqtt = relayByTopic.get(relay.mqttStateTopic);
    if (mqtt?.state === "ON" || mqtt?.state === "OFF") {
      anyLive = true;
      latestSeen = pickLatestSeen(
        latestSeen,
        mqtt.receivedAt,
        mqtt.retained ? new Date() : null
      );
      if (relay.lastState !== mqtt.state) {
        await prisma.relay.update({
          where: { id: relay.id },
          data: { lastState: mqtt.state },
        });
      }
    }
  }

  if (!anyLive && device.mqttTopicPrefix) {
    const { probeMqttPrefix } = await import("@/lib/mqtt");
    const probe = await probeMqttPrefix(device.mqttTopicPrefix.replace(/\/+$/, ""), 1500);
    if (probe.size > 0) anyLive = true;
  }

  const updated = await prisma.device.update({
    where: { id: deviceId },
    data: {
      isOnline: anyLive,
      lastSeenAt: latestSeen ?? (anyLive ? new Date() : device.lastSeenAt),
    },
    include: {
      room: true,
      sensors: true,
      relays: true,
    },
  });

  return updated;
}

/** Refresh online status for all enabled devices (e.g. when loading the devices admin page). */
export async function refreshAllDevicesOnlineStatus() {
  const devices = await prisma.device.findMany({
    where: { isEnabled: true },
    select: { id: true },
  });
  await Promise.all(devices.map((d) => refreshDeviceOnlineStatus(d.id)));
}