import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

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

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const lat = request.nextUrl.searchParams.get("lat") || "51.5074";
    const lon = request.nextUrl.searchParams.get("lon") || "-0.1278";

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
    );
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("forecast_days", "6");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { next: { revalidate: 900 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const current = data.current;
    const code = current?.weather_code ?? 0;
    const daily = data.daily;

    const forecast =
      daily?.time?.map((date: string, i: number) => ({
        date,
        weatherCode: daily.weather_code?.[i] ?? 0,
        description: WMO[daily.weather_code?.[i] ?? 0] || "Unknown",
        tempMax: daily.temperature_2m_max?.[i],
        tempMin: daily.temperature_2m_min?.[i],
      })) ?? [];

    return NextResponse.json({
      temperature: current?.temperature_2m,
      humidity: current?.relative_humidity_2m,
      windSpeed: current?.wind_speed_10m,
      weatherCode: code,
      description: WMO[code] || "Unknown",
      time: current?.time,
      latitude: data.latitude,
      longitude: data.longitude,
      forecast,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
