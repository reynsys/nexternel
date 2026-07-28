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
  /** Internal go2rtc base URL (API → go2rtc container). */
  go2rtcUrl: () => process.env.GO2RTC_URL || "http://go2rtc:1984",
  /**
   * Browser-facing go2rtc base URL for HLS/MSE play links.
   * Defaults to http://$SERVER_IP:1984 when unset.
   */
  go2rtcPublicUrl: () => {
    const explicit = (process.env.GO2RTC_PUBLIC_URL || "").trim();
    if (explicit) return explicit.replace(/\/$/, "");
    const ip = (process.env.SERVER_IP || "").trim();
    if (ip) return `http://${ip}:1984`;
    return "http://127.0.0.1:1984";
  },
};

export const ACCESS_COOKIE = "nexternel_access";
export const REFRESH_COOKIE = "nexternel_refresh";
