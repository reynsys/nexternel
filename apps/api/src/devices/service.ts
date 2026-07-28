import type { PoolClient } from "pg";
import { getPool } from "../db.js";
import type { EsphomeImportSuggestion } from "../esphome/yaml.js";
import { isDeviceSeenRecently } from "./presence.js";
import { deviceSlugFromTopicPrefix, slugify } from "./slug.js";

export type DeviceDetail = {
  id: string;
  roomId: string | null;
  roomName: string | null;
  name: string;
  slug: string;
  mqttTopicPrefix: string;
  esphomeName: string | null;
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
  ip_address: string | null;
  mac_address: string | null;
  is_enabled: boolean;
  is_online: boolean;
  last_seen_at: Date | null;
};

export async function listDevicesDetailed(): Promise<DeviceDetail[]> {
  const pool = getPool();
  const devices = await pool.query<DeviceRow>(
    `SELECT d.id, d.room_id, r.name AS room_name, d.name, d.slug,
            d.mqtt_topic_prefix, d.esphome_name,
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

  return devices.rows.map((d) => ({
    id: d.id,
    roomId: d.room_id,
    roomName: d.room_name,
    name: d.name,
    slug: d.slug,
    mqttTopicPrefix: d.mqtt_topic_prefix,
    esphomeName: d.esphome_name,
    ipAddress: d.ip_address,
    macAddress: d.mac_address,
    isEnabled: d.is_enabled,
    isOnline: isDeviceSeenRecently(d.last_seen_at),
    lastSeenAt: d.last_seen_at ? d.last_seen_at.toISOString() : null,
    sensors: sensorsByDevice.get(d.id) ?? [],
    relays: relaysByDevice.get(d.id) ?? [],
  }));
}

export async function getDeviceDetailed(id: string): Promise<DeviceDetail | null> {
  const all = await listDevicesDetailed();
  return all.find((d) => d.id === id) ?? null;
}

async function insertSensorsAndRelays(
  client: PoolClient,
  deviceId: string,
  mqttTopicPrefix: string,
  sensors: EsphomeImportSuggestion["sensors"],
  relays: EsphomeImportSuggestion["relays"]
) {
  for (const s of sensors) {
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
        `${mqttTopicPrefix}/sensor/${s.esphomeEntityId}/state`,
        s.esphomeEntityId,
      ]
    );
  }

  for (const r of relays) {
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
        `${mqttTopicPrefix}/switch/${r.esphomeEntityId}/command`,
        `${mqttTopicPrefix}/switch/${r.esphomeEntityId}/state`,
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
  ipAddress?: string | null;
  macAddress?: string | null;
  sensors?: EsphomeImportSuggestion["sensors"];
  relays?: EsphomeImportSuggestion["relays"];
}): Promise<DeviceDetail> {
  const mqttTopicPrefix = input.mqttTopicPrefix.trim().replace(/\/+$/, "");
  const slug = deviceSlugFromTopicPrefix(mqttTopicPrefix) || slugify(input.name);
  const esphomeName = (input.esphomeName || slug).trim();
  const pool = getPool();
  const client = await pool.connect();
  let deviceId = "";
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO devices (
         name, slug, room_id, mqtt_topic_prefix, esphome_name, ip_address, mac_address
       ) VALUES (
         $1, $2, $3, $4, $5,
         NULLIF($6, '')::inet,
         NULLIF($7, '')
       )
       RETURNING id`,
      [
        input.name.trim(),
        slug,
        input.roomId || null,
        mqttTopicPrefix,
        esphomeName,
        input.ipAddress?.trim() || "",
        input.macAddress?.trim() || "",
      ]
    );
    deviceId = inserted.rows[0]!.id;
    await insertSensorsAndRelays(
      client,
      deviceId,
      mqttTopicPrefix,
      input.sensors ?? [],
      input.relays ?? []
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
    ip_address: string | null;
    mac_address: string | null;
    is_enabled: boolean;
  }>(
    `SELECT id, name, room_id, mqtt_topic_prefix, esphome_name,
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
      suggestion.relays
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
