import { getPool } from "../db.js";

const ONLINE_FROM = [
  "awaiting_installation",
  "configured",
  "firmware_ready",
  "connecting",
  "offline",
] as const;

const OFFLINE_FROM = ["online", "connecting"] as const;

/** Keep esphome_lifecycle_state in sync with MQTT device presence. */
export async function syncEsphomeLifecycleForPrefix(
  mqttTopicPrefix: string,
  online: boolean
): Promise<void> {
  const allowed = online ? ONLINE_FROM : OFFLINE_FROM;
  const next = online ? "online" : "offline";
  await getPool().query(
    `UPDATE devices
     SET esphome_lifecycle_state = $3, updated_at = NOW()
     WHERE mqtt_topic_prefix = $1
       AND COALESCE(firmware_type, 'esphome') = 'esphome'
       AND esphome_lifecycle_state = ANY($2::text[])`,
    [mqttTopicPrefix, allowed, next]
  );
}
