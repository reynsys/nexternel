import { prisma } from "@/lib/db";
import { prismaRelayOrderBy } from "@/lib/relay-order";
import {
  discoverSwitchEntitiesFromProbe,
  probeMqttPrefix,
  publishRelayCommand,
} from "@/lib/mqtt";

export async function probeDeviceMqtt(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { relays: { orderBy: prismaRelayOrderBy } },
  });
  if (!device) return null;

  const prefix = device.mqttTopicPrefix.replace(/\/+$/, "");
  const probe = await probeMqttPrefix(prefix);
  const discovered = discoverSwitchEntitiesFromProbe(prefix, probe);

  const registered = device.relays.map((r) => ({
    id: r.id,
    name: r.name,
    esphomeEntityId: r.esphomeEntityId,
    commandTopic: r.mqttCommandTopic,
    stateTopic: r.mqttStateTopic,
    lastState: r.lastState,
    seenOnBroker: probe.has(r.mqttStateTopic),
    brokerState: probe.get(r.mqttStateTopic) ?? null,
  }));

  const allTopics = [...probe.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([topic, payload]) => ({ topic, payload }));

  const mqttConnected = probe.size > 0;
  const registeredTopicsSeen = registered.filter((r) => r.seenOnBroker).length;

  return {
    prefix,
    mqttConnected,
    registeredTopicsSeen,
    registered,
    discoveredSwitches: discovered,
    allTopics,
    hints: buildHints(mqttConnected, registered, discovered),
  };
}

function buildHints(
  mqttConnected: boolean,
  registered: { seenOnBroker: boolean; esphomeEntityId: string | null; stateTopic: string }[],
  discovered: { entityId: string }[]
): string[] {
  const hints: string[] = [];

  if (!mqttConnected) {
    hints.push(
      "No MQTT messages seen on this prefix. ESPHome may show Online in the builder (Wi‑Fi/API) but not be connected to MQTT. Check ESPHome logs for MQTT errors, broker IP, and password in secrets.yaml."
    );
    return hints;
  }

  const missing = registered.filter((r) => !r.seenOnBroker);
  if (missing.length > 0 && discovered.length > 0) {
    const foundIds = discovered.map((d) => d.entityId).join(", ");
    hints.push(
      `Registered state topics not on broker, but other switches exist: ${foundIds}. Entity IDs may not match ESPHome firmware — run Fix MQTT topics or add explicit id: fields in YAML and OTA update.`
    );
  }

  if (missing.length === registered.length && discovered.length === 0) {
    hints.push(
      "MQTT traffic exists on the prefix but no switch state topics found. Confirm topic_prefix in ESPHome YAML matches damnhome/garden-relays."
    );
  }

  return hints;
}

/** Align relay MQTT topics with what the broker actually publishes. */
export async function repairRelayTopicsFromMqtt(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { relays: { orderBy: prismaRelayOrderBy } },
  });
  if (!device) return null;

  const prefix = device.mqttTopicPrefix.replace(/\/+$/, "");
  const probe = await probeMqttPrefix(prefix);
  const discovered = discoverSwitchEntitiesFromProbe(prefix, probe);
  if (discovered.length === 0) return { repaired: 0, discovered: [] };

  let repaired = 0;
  const relays = device.relays;

  for (let i = 0; i < relays.length; i++) {
    const relay = relays[i];
    const match =
      discovered.find((d) => d.entityId === relay.esphomeEntityId) ??
      discovered[i];

    if (!match) continue;

    await prisma.relay.update({
      where: { id: relay.id },
      data: {
        esphomeEntityId: match.entityId,
        mqttStateTopic: match.stateTopic,
        mqttCommandTopic: `${prefix}/switch/${match.entityId}/command`,
        lastState: match.state,
      },
    });
    repaired++;
  }

  return { repaired, discovered };
}

export async function testRelayCommand(relayId: string, state: "ON" | "OFF") {
  const relay = await prisma.relay.findUnique({ where: { id: relayId } });
  if (!relay) return null;

  await publishRelayCommand(relay.mqttCommandTopic, state);

  const prefix = relay.mqttCommandTopic.split("/switch/")[0];
  const probe = await probeMqttPrefix(prefix, 2000);
  const newState = probe.get(relay.mqttStateTopic);

  return {
    commandTopic: relay.mqttCommandTopic,
    stateTopic: relay.mqttStateTopic,
    published: state,
    brokerStateAfter: newState ?? null,
    stateChanged: newState != null && newState.toUpperCase() === state,
  };
}
