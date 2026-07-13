import { prisma } from "@/lib/db";
import { prismaRelayOrderBy } from "@/lib/relay-order";

export async function syncDeviceMqttTopics(deviceId: string, mqttTopicPrefix: string) {
  const prefix = mqttTopicPrefix.replace(/\/+$/, "");
  const sensors = await prisma.sensor.findMany({ where: { deviceId } });
  for (const s of sensors) {
    const entity = s.esphomeEntityId || s.slug.replace(/-/g, "_");
    await prisma.sensor.update({
      where: { id: s.id },
      data: { mqttStateTopic: `${prefix}/sensor/${entity}/state` },
    });
  }
  const relays = await prisma.relay.findMany({ where: { deviceId } });
  for (const r of relays) {
    const entity = r.esphomeEntityId || r.slug.replace(/-/g, "_");
    await prisma.relay.update({
      where: { id: r.id },
      data: {
        mqttCommandTopic: `${prefix}/switch/${entity}/command`,
        mqttStateTopic: `${prefix}/switch/${entity}/state`,
      },
    });
  }
}

export const deviceInclude = {
  room: true,
  sensors: { orderBy: { name: "asc" as const } },
  relays: { orderBy: prismaRelayOrderBy },
};
