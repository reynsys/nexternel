import type { FastifyPluginAsync } from "fastify";
import { requireUser } from "../auth/plugin.js";

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Snow",
  80: "Showers",
  95: "Thunderstorm",
};

function wmoDescription(code: number): string {
  return WMO[code] || "Unknown";
}

export const weatherRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/weather", async (request, reply) => {
    if (!requireUser(request, reply)) return;

    const q = request.query as { lat?: string; lon?: string };
    const lat = Number(q.lat ?? 51.5074);
    const lon = Number(q.lon ?? -0.1278);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "lat and lon must be numbers" },
      });
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "lat/lon out of range" },
      });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
    );
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("forecast_days", "6");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("timezone", "auto");

    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return reply.code(502).send({
          error: { code: "upstream_error", message: "Weather service unavailable" },
        });
      }

      const data = (await res.json()) as {
        latitude?: number;
        longitude?: number;
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          weather_code?: number;
          wind_speed_10m?: number;
          time?: string;
        };
        daily?: {
          time?: string[];
          weather_code?: number[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
        };
      };

      const current = data.current;
      const code = current?.weather_code ?? 0;
      const daily = data.daily;
      const forecast =
        daily?.time?.map((date, i) => {
          const dayCode = daily.weather_code?.[i] ?? 0;
          return {
            date,
            weatherCode: dayCode,
            description: wmoDescription(dayCode),
            tempMax: daily.temperature_2m_max?.[i],
            tempMin: daily.temperature_2m_min?.[i],
          };
        }) ?? [];

      return {
        temperature: current?.temperature_2m,
        humidity: current?.relative_humidity_2m,
        windSpeed: current?.wind_speed_10m,
        weatherCode: code,
        description: wmoDescription(code),
        time: current?.time,
        latitude: data.latitude,
        longitude: data.longitude,
        forecast,
      };
    } catch (err) {
      request.log.warn({ err }, "weather fetch failed");
      return reply.code(502).send({
        error: { code: "upstream_error", message: "Weather service unavailable" },
      });
    }
  });
};
