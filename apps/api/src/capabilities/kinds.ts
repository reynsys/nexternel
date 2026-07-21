/** Map V2 sensor_type strings to capability kinds. */
export function kindFromSensorType(sensorType: string): string {
  const t = sensorType.trim().toLowerCase();
  const known = new Set([
    "temperature",
    "humidity",
    "pressure",
    "battery",
    "voltage",
    "current",
    "power",
    "energy",
    "brightness",
    "motion",
    "door",
    "illuminance",
    "co2",
    "pm25",
  ]);
  if (known.has(t)) return t;
  if (t.includes("temp")) return "temperature";
  if (t.includes("humid")) return "humidity";
  if (t.includes("motion") || t.includes("pir")) return "motion";
  if (t.includes("door") || t.includes("window")) return "door";
  if (t.includes("batt")) return "battery";
  return "number";
}
