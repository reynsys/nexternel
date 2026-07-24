import { getPool } from "../db.js";
import { kindFromSensorType } from "./kinds.js";

/**
 * Upsert capabilities + bindings from sensors / relays tables.
 * Safe to run repeatedly (idempotent on source_type + source_id).
 */
export async function syncCapabilitiesFromLegacy(): Promise<{
  sensors: number;
  relays: number;
}> {
  const pool = getPool();

  const sensors = await pool.query<{
    id: string;
    device_id: string;
    name: string;
    sensor_type: string;
    unit: string | null;
    mqtt_state_topic: string;
    is_enabled: boolean;
  }>(
    `SELECT id, device_id, name, sensor_type, unit, mqtt_state_topic,
            COALESCE(is_enabled, TRUE) AS is_enabled
     FROM sensors`
  );

  let sensorCount = 0;
  for (const s of sensors.rows) {
    const kind = kindFromSensorType(s.sensor_type);
    const cap = await pool.query<{ id: string }>(
      `INSERT INTO capabilities (device_id, kind, name, unit, source_type, source_id, is_enabled)
       VALUES ($1, $2, $3, $4, 'sensor', $5, $6)
       ON CONFLICT (source_type, source_id) DO UPDATE SET
         device_id = EXCLUDED.device_id,
         kind = EXCLUDED.kind,
         name = EXCLUDED.name,
         unit = EXCLUDED.unit,
         is_enabled = EXCLUDED.is_enabled,
         updated_at = NOW()
       RETURNING id`,
      [s.device_id, kind, s.name, s.unit, s.id, s.is_enabled]
    );
    const capabilityId = cap.rows[0].id;
    await pool.query(
      `INSERT INTO capability_bindings (capability_id, protocol, state_topic, command_topic)
       VALUES ($1, 'mqtt', $2, NULL)
       ON CONFLICT (capability_id) DO UPDATE SET
         state_topic = EXCLUDED.state_topic,
         command_topic = NULL,
         updated_at = NOW()`,
      [capabilityId, s.mqtt_state_topic]
    );
    sensorCount += 1;
  }

  const relays = await pool.query<{
    id: string;
    device_id: string;
    name: string;
    mqtt_state_topic: string;
    mqtt_command_topic: string;
    is_enabled: boolean;
  }>(
    `SELECT id, device_id, name, mqtt_state_topic, mqtt_command_topic,
            COALESCE(is_enabled, TRUE) AS is_enabled
     FROM relays`
  );

  let relayCount = 0;
  for (const r of relays.rows) {
    const cap = await pool.query<{ id: string }>(
      `INSERT INTO capabilities (device_id, kind, name, unit, source_type, source_id, is_enabled)
       VALUES ($1, 'switch', $2, NULL, 'relay', $3, $4)
       ON CONFLICT (source_type, source_id) DO UPDATE SET
         device_id = EXCLUDED.device_id,
         kind = 'switch',
         name = EXCLUDED.name,
         is_enabled = EXCLUDED.is_enabled,
         updated_at = NOW()
       RETURNING id`,
      [r.device_id, r.name, r.id, r.is_enabled]
    );
    const capabilityId = cap.rows[0].id;
    await pool.query(
      `INSERT INTO capability_bindings (capability_id, protocol, state_topic, command_topic)
       VALUES ($1, 'mqtt', $2, $3)
       ON CONFLICT (capability_id) DO UPDATE SET
         state_topic = EXCLUDED.state_topic,
         command_topic = EXCLUDED.command_topic,
         updated_at = NOW()`,
      [capabilityId, r.mqtt_state_topic, r.mqtt_command_topic]
    );
    relayCount += 1;
  }

  return { sensors: sensorCount, relays: relayCount };
}
