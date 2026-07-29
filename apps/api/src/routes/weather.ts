import type { FastifyPluginAsync } from "fastify";
import { requireUser } from "../auth/plugin.js";

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Slight rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Slight snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Thunderstorm + heavy hail",
};

function wmoDescription(code: number): string {
  return WMO[code] || "Unknown";
}

export const weatherRoutes: FastifyPluginAsync = async (app) => {
  /** Resolve a place name → lat/lon (Open-Meteo geocoding). */
  app.get("/api/v1/weather/geocode", async (request, reply) => {
    if (!requireUser(request, reply)) return;

    const q = request.query as { q?: string };
    const name = typeof q.q === "string" ? q.q.trim() : "";
    if (name.length < 2) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "q must be at least 2 characters" },
      });
    }

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        return reply.code(502).send({
          error: { code: "upstream_error", message: "Geocoding unavailable" },
        });
      }
      const data = (await res.json()) as {
        results?: Array<{
          name?: string;
          latitude?: number;
          longitude?: number;
          country?: string;
          admin1?: string;
          timezone?: string;
        }>;
      };
      const results = (data.results ?? [])
        .filter(
          (r) =>
            typeof r.latitude === "number" &&
            typeof r.longitude === "number" &&
            typeof r.name === "string"
        )
        .map((r) => ({
          name: r.name!,
          latitude: r.latitude!,
          longitude: r.longitude!,
          country: r.country ?? "",
          admin1: r.admin1 ?? "",
          timezone: r.timezone ?? "",
          label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
        }));
      return { results };
    } catch (err) {
      request.log.warn({ err }, "weather geocode failed");
      return reply.code(502).send({
        error: { code: "upstream_error", message: "Geocoding unavailable" },
      });
    }
  });

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
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    );
    url.searchParams.set("forecast_days", "6");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("temperature_unit", "celsius");
    // Local calendar days for the coordinates (not the browser/server TZ)
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
        timezone?: string;
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
          precipitation_probability_max?: number[];
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
            precipProbability: daily.precipitation_probability_max?.[i],
          };
        }) ?? [];

      return {
        temperature: current?.temperature_2m,
        humidity: current?.relative_humidity_2m,
        windSpeed: current?.wind_speed_10m,
        weatherCode: code,
        description: wmoDescription(code),
        time: current?.time,
        requestedLatitude: lat,
        requestedLongitude: lon,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
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
