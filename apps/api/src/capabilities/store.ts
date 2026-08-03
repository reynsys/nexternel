import { getPool } from "../db.js";

export type CapabilityRow = {
  id: string;
  device_id: string;
  device_name: string;
  room_id: string | null;
  room_name: string | null;
  kind: string;
  name: string;
  unit: string | null;
  source_type: string;
  source_id: string;
  is_enabled: boolean;
  state_topic: string | null;
  command_topic: string | null;
  firmware_type: string;
};

export async function listCapabilities(): Promise<CapabilityRow[]> {
  const result = await getPool().query<CapabilityRow>(
    `SELECT c.id, c.device_id, d.name AS device_name, d.room_id, r.name AS room_name,
            c.kind, c.name, c.unit, c.source_type, c.source_id, c.is_enabled,
            b.state_topic, b.command_topic,
            COALESCE(d.firmware_type, 'esphome') AS firmware_type
     FROM capabilities c
     JOIN devices d ON d.id = c.device_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN capability_bindings b ON b.capability_id = c.id
     WHERE c.is_enabled = TRUE
       AND COALESCE(d.is_enabled, TRUE) = TRUE
     ORDER BY COALESCE(r.name, ''), d.name ASC, c.name ASC`
  );
  return result.rows;
}

export async function getCapabilityById(id: string): Promise<CapabilityRow | null> {
  const result = await getPool().query<CapabilityRow>(
    `SELECT c.id, c.device_id, d.name AS device_name, d.room_id, r.name AS room_name,
            c.kind, c.name, c.unit, c.source_type, c.source_id, c.is_enabled,
            b.state_topic, b.command_topic,
            COALESCE(d.firmware_type, 'esphome') AS firmware_type
     FROM capabilities c
     JOIN devices d ON d.id = c.device_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN capability_bindings b ON b.capability_id = c.id
     WHERE c.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function listStateTopicBindings(): Promise<
  { capability_id: string; state_topic: string; kind: string }[]
> {
  const result = await getPool().query<{
    capability_id: string;
    state_topic: string;
    kind: string;
  }>(
    `SELECT b.capability_id, b.state_topic, c.kind
     FROM capability_bindings b
     JOIN capabilities c ON c.id = b.capability_id
     JOIN devices d ON d.id = c.device_id
     WHERE b.state_topic IS NOT NULL AND b.state_topic <> ''
       AND c.is_enabled = TRUE
       AND COALESCE(d.firmware_type, 'esphome') <> 'octopus'`
  );
  return result.rows;
}

export async function listDevicePrefixes(): Promise<string[]> {
  const result = await getPool().query<{ mqtt_topic_prefix: string }>(
    `SELECT DISTINCT mqtt_topic_prefix FROM devices
     WHERE mqtt_topic_prefix IS NOT NULL AND mqtt_topic_prefix <> ''
       AND COALESCE(firmware_type, 'esphome') <> 'octopus'`
  );
  return result.rows.map((r) => r.mqtt_topic_prefix);
}

/** Shelly relays: prefix + switch:N → capability id (for events/rpc ingest). */
export async function listShellySwitchBindings(): Promise<
  { capability_id: string; mqtt_topic_prefix: string; component_key: string }[]
> {
  const result = await getPool().query<{
    capability_id: string;
    mqtt_topic_prefix: string;
    component_key: string;
  }>(
    `SELECT c.id AS capability_id,
            d.mqtt_topic_prefix,
            lower(r.esphome_entity_id) AS component_key
     FROM capabilities c
     JOIN devices d ON d.id = c.device_id
     JOIN relays r ON r.id = c.source_id AND c.source_type = 'relay'
     WHERE COALESCE(d.firmware_type, 'esphome') = 'shelly'
       AND c.is_enabled = TRUE
       AND d.mqtt_topic_prefix IS NOT NULL AND d.mqtt_topic_prefix <> ''
       AND r.esphome_entity_id ~* '^(switch|relay):[0-9]+$'`
  );
  return result.rows;
}
