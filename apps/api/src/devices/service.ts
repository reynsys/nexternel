import type { PoolClient } from "pg";
import { getPool } from "../db.js";
import type { EsphomeImportSuggestion } from "../esphome/yaml.js";
import { buildShellySwitchTopics } from "../shelly/topics.js";
import { buildShellyRelays, resolveShellySwitchCount } from "../shelly/suggest.js";
import { LIVE_CAPABILITY_PRESENCE_MS } from "./presence.js";
import { getAllLiveStates } from "../telemetry/state-cache.js";
import { deviceSlugFromTopicPrefix, slugify } from "./slug.js";

export type RelayInsert = EsphomeImportSuggestion["relays"][number] & {
  /** Absolute topics (Shelly); when set, ESPHome path templates are not used. */
  mqttCommandTopic?: string;
  mqttStateTopic?: string;
};

export type DeviceDetail = {
  id: string;
  roomId: string | null;
  roomName: string | null;
  name: string;
  slug: string;
  mqttTopicPrefix: string;
  esphomeName: string | null;
  firmwareType: string;
  ipAddress: string | null;
  macAddress: string | null;
  isEnabled: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  sensors: {
    id: string;
    name: string;
    slug: string;
    sensorType: string;
    unit: string | null;
    esphomeEntityId: string | null;
    mqttStateTopic: string;
    isEnabled: boolean;
  }[];
  relays: {
    id: string;
    name: string;
    slug: string;
    esphomeEntityId: string | null;
    mqttCommandTopic: string;
    mqttStateTopic: string;
    lastState: string | null;
    isEnabled: boolean;
  }[];
};

type DeviceRow = {
  id: string;
  room_id: string | null;
  room_name: string | null;
  name: string;
  slug: string;
  mqtt_topic_prefix: string;
  esphome_name: string | null;
  firmware_type: string;
  ip_address: string | null;
  mac_address: string | null;
  is_enabled: boolean;
  is_online: boolean;
  last_seen_at: Date | null;
};

async function deviceIdsWithRecentLiveSignal(): Promise<Set<string>> {
  const states = getAllLiveStates();
  const recentCapIds = states
    .filter(
      (s) =>
        s.quality === "good" &&
        Date.now() - Date.parse(s.updatedAt) < LIVE_CAPABILITY_PRESENCE_MS
    )
    .map((s) => s.capabilityId);
  if (recentCapIds.length === 0) return new Set();
  const result = await getPool().query<{ device_id: string }>(
    `SELECT DISTINCT device_id FROM capabilities WHERE id = ANY($1::uuid[])`,
    [recentCapIds]
  );
  return new Set(result.rows.map((r) => r.device_id));
}

export async function listDevicesDetailed(): Promise<DeviceDetail[]> {
  const pool = getPool();
  const devices = await pool.query<DeviceRow>(
    `SELECT d.id, d.room_id, r.name AS room_name, d.name, d.slug,
            d.mqtt_topic_prefix, d.esphome_name,
            COALESCE(d.firmware_type, 'esphome') AS firmware_type,
            host(d.ip_address)::text AS ip_address, d.mac_address,
            COALESCE(d.is_enabled, TRUE) AS is_enabled,
            d.is_online, d.last_seen_at
     FROM devices d
     LEFT JOIN rooms r ON r.id = d.room_id
     ORDER BY d.name ASC`
  );

  if (devices.rows.length === 0) return [];

  const ids = devices.rows.map((d) => d.id);
  const sensors = await pool.query<{
    id: string;
    device_id: string;
    name: string;
    slug: string;
    sensor_type: string;
    unit: string | null;
    esphome_entity_id: string | null;
    mqtt_state_topic: string;
    is_enabled: boolean;
  }>(
    `SELECT id, device_id, name, slug, sensor_type, unit, esphome_entity_id,
            mqtt_state_topic, COALESCE(is_enabled, TRUE) AS is_enabled
     FROM sensors
     WHERE device_id = ANY($1::uuid[])
     ORDER BY name ASC`,
    [ids]
  );
  const relays = await pool.query<{
    id: string;
    device_id: string;
    name: string;
    slug: string;
    esphome_entity_id: string | null;
    mqtt_command_topic: string;
    mqtt_state_topic: string;
    last_state: string | null;
    is_enabled: boolean;
  }>(
    `SELECT id, device_id, name, slug, esphome_entity_id,
            mqtt_command_topic, mqtt_state_topic, last_state,
            COALESCE(is_enabled, TRUE) AS is_enabled
     FROM relays
     WHERE device_id = ANY($1::uuid[])
     ORDER BY name ASC`,
    [ids]
  );

  const sensorsByDevice = new Map<string, DeviceDetail["sensors"]>();
  for (const s of sensors.rows) {
    const list = sensorsByDevice.get(s.device_id) ?? [];
    list.push({
      id: s.id,
      name: s.name,
      slug: s.slug,
      sensorType: s.sensor_type,
      unit: s.unit,
      esphomeEntityId: s.esphome_entity_id,
      mqttStateTopic: s.mqtt_state_topic,
      isEnabled: s.is_enabled,
    });
    sensorsByDevice.set(s.device_id, list);
  }

  const relaysByDevice = new Map<string, DeviceDetail["relays"]>();
  for (const r of relays.rows) {
    const list = relaysByDevice.get(r.device_id) ?? [];
    list.push({
      id: r.id,
      name: r.name,
      slug: r.slug,
      esphomeEntityId: r.esphome_entity_id,
      mqttCommandTopic: r.mqtt_command_topic,
      mqttStateTopic: r.mqtt_state_topic,
      lastState: r.last_state,
      isEnabled: r.is_enabled,
    });
    relaysByDevice.set(r.device_id, list);
  }

  const liveDeviceIds = await deviceIdsWithRecentLiveSignal();

  return devices.rows.map((d) => ({
    id: d.id,
    roomId: d.room_id,
    roomName: d.room_name,
    name: d.name,
    slug: d.slug,
    mqttTopicPrefix: d.mqtt_topic_prefix,
    esphomeName: d.esphome_name,
    firmwareType: d.firmware_type || "esphome",
    ipAddress: d.ip_address,
    macAddress: d.mac_address,
    isEnabled: d.is_enabled,
    isOnline: Boolean(d.is_online) || liveDeviceIds.has(d.id),
    lastSeenAt: d.last_seen_at ? d.last_seen_at.toISOString() : null,
    sensors: sensorsByDevice.get(d.id) ?? [],
    relays: relaysByDevice.get(d.id) ?? [],
  }));
}

export async function getDeviceDetailed(id: string): Promise<DeviceDetail | null> {
  const all = await listDevicesDetailed();
  return all.find((d) => d.id === id) ?? null;
}

async function pruneOrphanSensorsAndRelays(
  client: PoolClient,
  deviceId: string,
  sensorSlugs: string[],
  relaySlugs: string[]
) {
  if (sensorSlugs.length > 0) {
    await client.query(
      `DELETE FROM capabilities
       WHERE source_type = 'sensor'
         AND source_id IN (
           SELECT id FROM sensors
           WHERE device_id = $1 AND NOT (slug = ANY($2::text[]))
         )`,
      [deviceId, sensorSlugs]
    );
    await client.query(
      `DELETE FROM sensors WHERE device_id = $1 AND NOT (slug = ANY($2::text[]))`,
      [deviceId, sensorSlugs]
    );
  }

  if (relaySlugs.length > 0) {
    await client.query(
      `DELETE FROM capabilities
       WHERE source_type = 'relay'
         AND source_id IN (
           SELECT id FROM relays
           WHERE device_id = $1 AND NOT (slug = ANY($2::text[]))
         )`,
      [deviceId, relaySlugs]
    );
    await client.query(
      `DELETE FROM relays WHERE device_id = $1 AND NOT (slug = ANY($2::text[]))`,
      [deviceId, relaySlugs]
    );
  }
}

async function upsertSensorFromSuggestion(
  client: PoolClient,
  deviceId: string,
  mqttTopicPrefix: string,
  s: EsphomeImportSuggestion["sensors"][number]
) {
  const stateTopic = `${mqttTopicPrefix}/sensor/${s.esphomeEntityId}/state`;
  const matchers: { sql: string; params: unknown[] }[] = [
    { sql: "name = $2", params: [s.name] },
    { sql: "esphome_entity_id = $2", params: [s.esphomeEntityId] },
    { sql: "slug = $2", params: [s.slug] },
  ];
  if (s.sensorType === "power") {
    matchers.push({ sql: "sensor_type = $2", params: ["power"] });
  }
  if (s.sensorType === "energy") {
    const hint = /daily/i.test(s.name) ? "%daily%" : "%total%";
    matchers.push({
      sql: "sensor_type = $2 AND LOWER(name) LIKE $3",
      params: ["energy", hint],
    });
  }

  for (const m of matchers) {
    const result = await client.query(
      `UPDATE sensors SET
         name = $3,
         slug = $4,
         sensor_type = $5,
         unit = $6,
         mqtt_state_topic = $7,
         esphome_entity_id = $8,
         updated_at = NOW()
       WHERE device_id = $1 AND ${m.sql}
       RETURNING id`,
      [
        deviceId,
        ...m.params,
        s.name,
        s.slug,
        s.sensorType,
        s.unit ?? null,
        stateTopic,
        s.esphomeEntityId,
      ]
    );
    if ((result.rowCount ?? 0) > 0) return;
  }

  await client.query(
    `INSERT INTO sensors (
       device_id, name, slug, sensor_type, unit, mqtt_state_topic, esphome_entity_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (device_id, slug) DO UPDATE SET
       name = EXCLUDED.name,
       sensor_type = EXCLUDED.sensor_type,
       unit = EXCLUDED.unit,
       mqtt_state_topic = EXCLUDED.mqtt_state_topic,
       esphome_entity_id = EXCLUDED.esphome_entity_id,
       updated_at = NOW()`,
    [
      deviceId,
      s.name,
      s.slug,
      s.sensorType,
      s.unit ?? null,
      stateTopic,
      s.esphomeEntityId,
    ]
  );
}

async function insertSensorsAndRelays(
  client: PoolClient,
  deviceId: string,
  mqttTopicPrefix: string,
  sensors: EsphomeImportSuggestion["sensors"],
  relays: RelayInsert[],
  firmwareType = "esphome",
  pruneOrphans = false
) {
  for (const s of sensors) {
    await upsertSensorFromSuggestion(client, deviceId, mqttTopicPrefix, s);
  }

  if (pruneOrphans && sensors.length > 0) {
    await pruneOrphanSensorsAndRelays(
      client,
      deviceId,
      sensors.map((s) => s.slug),
      relays.map((r) => r.slug)
    );
  }

  for (const r of relays) {
    const useAbsolute =
      firmwareType === "shelly" ||
      (typeof r.mqttCommandTopic === "string" &&
        typeof r.mqttStateTopic === "string");
    const commandTopic = useAbsolute
      ? (r.mqttCommandTopic as string)
      : `${mqttTopicPrefix}/switch/${r.esphomeEntityId}/command`;
    const stateTopic = useAbsolute
      ? (r.mqttStateTopic as string)
      : `${mqttTopicPrefix}/switch/${r.esphomeEntityId}/state`;

    await client.query(
      `INSERT INTO relays (
         device_id, name, slug, mqtt_command_topic, mqtt_state_topic,
         esphome_entity_id, gpio_pin
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (device_id, slug) DO UPDATE SET
         name = EXCLUDED.name,
         mqtt_command_topic = EXCLUDED.mqtt_command_topic,
         mqtt_state_topic = EXCLUDED.mqtt_state_topic,
         esphome_entity_id = EXCLUDED.esphome_entity_id,
         gpio_pin = EXCLUDED.gpio_pin,
         updated_at = NOW()`,
      [
        deviceId,
        r.name,
        r.slug,
        commandTopic,
        stateTopic,
        r.esphomeEntityId,
        r.gpioPin ?? null,
      ]
    );
  }
}

export async function createDevice(input: {
  name: string;
  roomId?: string | null;
  mqttTopicPrefix: string;
  esphomeName?: string | null;
  firmwareType?: string;
  shellyChannel?: number;
  /** Phase 3: number of switch outputs (overrides single-channel default). */
  shellySwitchCount?: number;
  shellyModelId?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  sensors?: EsphomeImportSuggestion["sensors"];
  relays?: RelayInsert[];
}): Promise<DeviceDetail> {
  const mqttTopicPrefix = input.mqttTopicPrefix.trim().replace(/\/+$/, "");
  const firmwareType = (input.firmwareType || "esphome").trim().toLowerCase();
  const slug = deviceSlugFromTopicPrefix(mqttTopicPrefix) || slugify(input.name);
  const esphomeName =
    firmwareType === "shelly"
      ? null
      : (input.esphomeName || slug).trim();

  let sensors = input.sensors ?? [];
  let relays = input.relays ?? [];

  if (firmwareType === "shelly" && relays.length === 0) {
    const switchCount = resolveShellySwitchCount({
      shellyModelId: input.shellyModelId,
      shellySwitchCount: input.shellySwitchCount,
      shellyChannel: input.shellyChannel,
    });
    // Legacy: shellyChannel > 0 with no count → single relay on that channel index.
    if (
      switchCount === 1 &&
      typeof input.shellyChannel === "number" &&
      input.shellyChannel > 0 &&
      !input.shellyModelId &&
      input.shellySwitchCount == null
    ) {
      const topics = buildShellySwitchTopics(mqttTopicPrefix, input.shellyChannel);
      relays = [
        {
          name: input.name.trim() || "Switch",
          slug: topics.slug,
          esphomeEntityId: topics.entityId,
          mqttCommandTopic: topics.commandTopic,
          mqttStateTopic: topics.stateTopic,
        },
      ];
    } else {
      relays = buildShellyRelays({
        deviceName: input.name.trim() || "Shelly",
        topicPrefix: mqttTopicPrefix,
        switchCount,
      });
    }
  }

  const pool = getPool();
  const client = await pool.connect();
  let deviceId = "";
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO devices (
         name, slug, room_id, mqtt_topic_prefix, esphome_name, firmware_type,
         ip_address, mac_address
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         NULLIF($7, '')::inet,
         NULLIF($8, '')
       )
       RETURNING id`,
      [
        input.name.trim(),
        slug,
        input.roomId || null,
        mqttTopicPrefix,
        esphomeName,
        firmwareType,
        input.ipAddress?.trim() || "",
        input.macAddress?.trim() || "",
      ]
    );
    deviceId = inserted.rows[0]!.id;
    await insertSensorsAndRelays(
      client,
      deviceId,
      mqttTopicPrefix,
      sensors,
      relays,
      firmwareType
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const created = await getDeviceDetailed(deviceId);
  if (!created) throw new Error("Device created but could not be loaded");
  return created;
}

export async function updateDevice(
  id: string,
  patch: {
    name?: string;
    roomId?: string | null;
    mqttTopicPrefix?: string;
    esphomeName?: string | null;
    ipAddress?: string | null;
    macAddress?: string | null;
    isEnabled?: boolean;
  }
): Promise<DeviceDetail | null> {
  const existing = await getPool().query<{
    id: string;
    name: string;
    room_id: string | null;
    mqtt_topic_prefix: string;
    esphome_name: string | null;
    firmware_type: string;
    ip_address: string | null;
    mac_address: string | null;
    is_enabled: boolean;
  }>(
    `SELECT id, name, room_id, mqtt_topic_prefix, esphome_name,
            COALESCE(firmware_type, 'esphome') AS firmware_type,
            host(ip_address)::text AS ip_address, mac_address,
            COALESCE(is_enabled, TRUE) AS is_enabled
     FROM devices WHERE id = $1`,
    [id]
  );
  if (existing.rowCount === 0) return null;
  const cur = existing.rows[0]!;

  const name = patch.name !== undefined ? patch.name.trim() : cur.name;
  if (!name) throw new Error("Name cannot be empty");

  const roomId = patch.roomId !== undefined ? patch.roomId || null : cur.room_id;
  const mqttTopicPrefix =
    patch.mqttTopicPrefix !== undefined
      ? patch.mqttTopicPrefix.trim().replace(/\/+$/, "")
      : cur.mqtt_topic_prefix;
  if (!mqttTopicPrefix) throw new Error("MQTT topic prefix is required");

  const esphomeName =
    patch.esphomeName !== undefined
      ? patch.esphomeName?.trim() || null
      : cur.esphome_name;
  const ipAddress =
    patch.ipAddress !== undefined ? patch.ipAddress?.trim() || null : cur.ip_address;
  const macAddress =
    patch.macAddress !== undefined ? patch.macAddress?.trim() || null : cur.mac_address;
  const isEnabled =
    patch.isEnabled !== undefined ? Boolean(patch.isEnabled) : cur.is_enabled;

  const prefixChanged = mqttTopicPrefix !== cur.mqtt_topic_prefix;

  await getPool().query(
    `UPDATE devices SET
       name = $2,
       room_id = $3,
       mqtt_topic_prefix = $4,
       esphome_name = $5,
       ip_address = NULLIF($6, '')::inet,
       mac_address = NULLIF($7, ''),
       is_enabled = $8,
       updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      name,
      roomId,
      mqttTopicPrefix,
      esphomeName,
      ipAddress ?? "",
      macAddress ?? "",
      isEnabled,
    ]
  );

  if (prefixChanged) {
    if (cur.firmware_type === "shelly") {
      const relays = await getPool().query<{
        id: string;
        esphome_entity_id: string | null;
      }>(`SELECT id, esphome_entity_id FROM relays WHERE device_id = $1`, [id]);
      for (const r of relays.rows) {
        const m = /^switch:(\d+)$/i.exec(r.esphome_entity_id || "");
        const channel = m ? Number(m[1]) : 0;
        const topics = buildShellySwitchTopics(mqttTopicPrefix, channel);
        await getPool().query(
          `UPDATE relays SET
             mqtt_state_topic = $2,
             mqtt_command_topic = $3,
             updated_at = NOW()
           WHERE id = $1`,
          [r.id, topics.stateTopic, topics.commandTopic]
        );
      }
    } else {
      await getPool().query(
        `UPDATE sensors SET
           mqtt_state_topic = $2 || '/sensor/' || COALESCE(esphome_entity_id, slug) || '/state',
           updated_at = NOW()
         WHERE device_id = $1`,
        [id, mqttTopicPrefix]
      );
      await getPool().query(
        `UPDATE relays SET
           mqtt_state_topic = $2 || '/switch/' || COALESCE(esphome_entity_id, slug) || '/state',
           mqtt_command_topic = $2 || '/switch/' || COALESCE(esphome_entity_id, slug) || '/command',
           updated_at = NOW()
         WHERE device_id = $1`,
        [id, mqttTopicPrefix]
      );
    }
  }

  return getDeviceDetailed(id);
}

export async function deleteDevice(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM devices WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function syncDeviceFromEsphomeSuggestion(
  id: string,
  suggestion: EsphomeImportSuggestion
): Promise<{ addedRelays: number; updatedRelays: number; totalRelays: number }> {
  const device = await getDeviceDetailed(id);
  if (!device) throw new Error("Device not found");
  if (device.firmwareType === "shelly") {
    throw new Error("ESPHome sync is not available for Shelly devices");
  }

  const mqttTopicPrefix = suggestion.mqttTopicPrefix || device.mqttTopicPrefix;
  const pool = getPool();
  const before = await pool.query<{ slug: string }>(
    `SELECT slug FROM relays WHERE device_id = $1`,
    [id]
  );
  const beforeSlugs = new Set(before.rows.map((r) => r.slug));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE devices SET
         mqtt_topic_prefix = $2,
         esphome_name = COALESCE($3, esphome_name),
         updated_at = NOW()
       WHERE id = $1`,
      [id, mqttTopicPrefix, suggestion.esphomeName || null]
    );
    await insertSensorsAndRelays(
      client,
      id,
      mqttTopicPrefix,
      suggestion.sensors,
      suggestion.relays,
      device.firmwareType,
      true
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const after = await pool.query<{ slug: string }>(
    `SELECT slug FROM relays WHERE device_id = $1`,
    [id]
  );
  let addedRelays = 0;
  let updatedRelays = 0;
  for (const row of after.rows) {
    if (beforeSlugs.has(row.slug)) updatedRelays += 1;
    else addedRelays += 1;
  }

  return {
    addedRelays,
    updatedRelays,
    totalRelays: after.rows.length,
  };
}

export async function renameRelay(relayId: string, name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  const result = await getPool().query(
    `UPDATE relays SET name = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [relayId, trimmed]
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await getPool().query(
    `UPDATE capabilities SET name = $2, updated_at = NOW()
     WHERE source_type = 'relay' AND source_id = $1`,
    [relayId, trimmed]
  );
  return true;
}

export async function renameSensor(sensorId: string, name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  const result = await getPool().query(
    `UPDATE sensors SET name = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [sensorId, trimmed]
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await getPool().query(
    `UPDATE capabilities SET name = $2, updated_at = NOW()
     WHERE source_type = 'sensor' AND source_id = $1`,
    [sensorId, trimmed]
  );
  return true;
}
