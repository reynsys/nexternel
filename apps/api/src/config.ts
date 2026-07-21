function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * Runtime config for the V3 API.
 * JWT_SECRET may reuse V2 NEXTAUTH_SECRET so one secret works in compose.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: () => required("DATABASE_URL"),
  jwtSecret: () => {
    const raw = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
    const s = raw.trim().replace(/^["']|["']$/g, "");
    if (!s) {
      throw new Error("JWT_SECRET or NEXTAUTH_SECRET is not set");
    }
    return s;
  },
  accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  cookieSecure:
    process.env.COOKIE_SECURE === "true"
      ? true
      : process.env.COOKIE_SECURE === "false"
        ? false
        : false,
  mqttBroker: () => process.env.MQTT_BROKER || "mqtt://mosquitto:1883",
  mqttUsername: () => process.env.MQTT_USERNAME || "",
  mqttPassword: () => process.env.MQTT_PASSWORD || "",
  influx: () => ({
    url: process.env.INFLUXDB_URL || "http://influxdb:8086",
    token: process.env.INFLUXDB_TOKEN || "",
    org: process.env.INFLUXDB_ORG || "damnhome",
    bucket: process.env.INFLUXDB_BUCKET || "sensors",
  }),
  serverIp: () => process.env.SERVER_IP || "",
};

export const ACCESS_COOKIE = "nexternel_access";
export const REFRESH_COOKIE = "nexternel_refresh";
