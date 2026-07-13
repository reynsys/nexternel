import { prisma } from "@/lib/db";
import { syncDeviceMqttTopics } from "@/lib/device-mqtt";
import { suggestFromEsphomeCandidates } from "@/lib/esphome-yaml";

function yamlNameCandidates(
  device: { esphomeName: string | null; slug: string; name: string },
  override?: string
): string[] {
  const raw = [
    override,
    device.esphomeName,
    device.slug,
    device.esphomeName?.replace(/_/g, "-"),
    device.esphomeName?.replace(/-/g, "_"),
    device.slug.replace(/_/g, "-"),
    device.slug.replace(/-/g, "_"),
    device.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  ].filter(Boolean) as string[];

  return [...new Set(raw)];
}

function relayTopics(prefix: string, entityId: string) {
  return {
    mqttCommandTopic: `${prefix}/switch/${entityId}/command`,
    mqttStateTopic: `${prefix}/switch/${entityId}/state`,
  };
}

function sortByGpio<T extends { gpioPin?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.gpioPin ?? 999) - (b.gpioPin ?? 999));
}

export async function syncDeviceFromEsphome(deviceId: string, esphomeNameOverride?: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { sensors: true, relays: true },
  });
  if (!device) return null;

  const candidates = yamlNameCandidates(device, esphomeNameOverride);
  const suggestion = await suggestFromEsphomeCandidates(candidates);
  if (!suggestion) return null;

  const prefix = suggestion.mqttTopicPrefix.replace(/\/+$/, "");
  let addedSensors = 0;
  let addedRelays = 0;
  let updatedRelays = 0;

  const existingSensorIds = new Set(
    device.sensors.map((s) => s.esphomeEntityId).filter(Boolean) as string[]
  );
  for (const s of suggestion.sensors) {
    if (existingSensorIds.has(s.esphomeEntityId)) continue;
    await prisma.sensor.create({
      data: {
        deviceId,
        name: s.name,
        slug: s.slug,
        sensorType: s.sensorType,
        unit: s.unit,
        esphomeEntityId: s.esphomeEntityId,
        mqttStateTopic: `${prefix}/sensor/${s.esphomeEntityId}/state`,
      },
    });
    existingSensorIds.add(s.esphomeEntityId);
    addedSensors++;
  }

  const yamlRelays = sortByGpio(suggestion.relays);
  const dbRelays = sortByGpio(device.relays);
  const claimedDbIds = new Set<string>();

  for (let i = 0; i < yamlRelays.length; i++) {
    const r = yamlRelays[i];
    const topics = relayTopics(prefix, r.esphomeEntityId);

    let existing =
      device.relays.find(
        (x) =>
          !claimedDbIds.has(x.id) &&
          (x.esphomeEntityId === r.esphomeEntityId ||
            (r.gpioPin != null && x.gpioPin === r.gpioPin))
      ) ?? dbRelays[i];

    if (existing && !claimedDbIds.has(existing.id)) {
      claimedDbIds.add(existing.id);
      const slugTaken = device.relays.some(
        (x) => x.id !== existing!.id && x.slug === r.slug
      );
      await prisma.relay.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          esphomeEntityId: r.esphomeEntityId,
          gpioPin: r.gpioPin ?? existing.gpioPin,
          slug: slugTaken ? `${r.slug}-${r.gpioPin ?? i + 1}` : r.slug,
          ...topics,
        },
      });
      updatedRelays++;
      continue;
    }

    await prisma.relay.create({
      data: {
        deviceId,
        name: r.name,
        slug: r.slug,
        esphomeEntityId: r.esphomeEntityId,
        gpioPin: r.gpioPin ?? null,
        ...topics,
      },
    });
    addedRelays++;
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      mqttTopicPrefix: prefix,
      esphomeName: suggestion.esphomeName,
    },
  });

  await syncDeviceMqttTopics(deviceId, prefix);

  const relayCount = await prisma.relay.count({ where: { deviceId } });

  return {
    suggestion,
    yamlCandidates: candidates,
    addedSensors,
    addedRelays,
    updatedRelays,
    totalSensors: existingSensorIds.size,
    totalRelays: relayCount,
  };
}
