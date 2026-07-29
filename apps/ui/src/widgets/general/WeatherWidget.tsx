import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { api, type WeatherResponse, type WidgetInstance } from "../../api";
import { parseWeatherConfig, widgetTitleOr } from "./config";
import { weatherEmojiForCode } from "./weather-icons";

/** Parse Open-Meteo daily `YYYY-MM-DD` as local calendar day (avoid UTC shift). */
function weekdayShort(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) {
    return new Date(isoDate).toLocaleDateString(undefined, { weekday: "short" });
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function fmtCoord(n: number | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export function WeatherWidget({ widget }: { widget: WidgetInstance }) {
  const cfg = parseWeatherConfig(widget.config);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.weather(cfg.weatherLat, cfg.weatherLon);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Weather unavailable");
        }
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 900_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [cfg.weatherLat, cfg.weatherLon]);

  const title =
    widgetTitleOr(widget, "Weather") ||
    (cfg.weatherLocation !== "Weather" ? cfg.weatherLocation : "Weather");

  const code = data?.weatherCode ?? 0;
  const todayForecast = data?.forecast?.[0];
  const upcoming = data?.forecast?.slice(1, 6) ?? [];
  const todayMax =
    todayForecast?.tempMax != null ? `${Math.round(todayForecast.tempMax)}°` : null;
  const todayMin =
    todayForecast?.tempMin != null ? `${Math.round(todayForecast.tempMin)}°` : null;

  const resolvedLat = data?.latitude ?? cfg.weatherLat;
  const resolvedLon = data?.longitude ?? cfg.weatherLon;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flexShrink: 0 }}>
        {title}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        title={`${fmtCoord(resolvedLat, 4)}, ${fmtCoord(resolvedLon, 4)}${
          data?.timezone ? ` · ${data.timezone}` : ""
        }`}
        sx={{ mb: 0.5, flexShrink: 0, fontSize: "0.65rem" }}
      >
        {fmtCoord(resolvedLat)}, {fmtCoord(resolvedLon)}
        {data?.description ? ` · ${data.description}` : ""}
      </Typography>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ flexShrink: 0, py: 0.5 }}
      >
        {(todayMax || todayMin) && (
          <Typography variant="caption" sx={{ tabularNums: true }}>
            {todayMax ?? "—"}
            {todayMin && (
              <Typography component="span" variant="caption" color="text.secondary">
                {" "}
                / {todayMin}
              </Typography>
            )}
          </Typography>
        )}
        <Typography sx={{ fontSize: "1.75rem", lineHeight: 1 }} aria-hidden>
          {weatherEmojiForCode(code)}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ tabularNums: true }}>
          {data?.temperature !== undefined ? `${Math.round(data.temperature)}°C` : "—"}
        </Typography>
        <Stack spacing={0.25}>
          <Typography variant="caption" color="text.secondary">
            💧 {data?.humidity ?? "—"}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            🌬{" "}
            {data?.windSpeed != null ? `${Math.round(data.windSpeed)} mph` : "—"}
          </Typography>
        </Stack>
      </Stack>
      {upcoming.length > 0 && (
        <Box
          sx={{
            mt: "auto",
            pt: 1,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "grid",
            gridTemplateColumns: `repeat(${upcoming.length}, 1fr)`,
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          {upcoming.map((day) => {
            const label = weekdayShort(day.date);
            const max = day.tempMax != null ? `${Math.round(day.tempMax)}°` : "—";
            const min = day.tempMin != null ? `${Math.round(day.tempMin)}°` : "—";
            return (
              <Stack key={day.date} alignItems="center" spacing={0.25}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: "1rem", lineHeight: 1 }} aria-hidden>
                  {weatherEmojiForCode(day.weatherCode)}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.65rem", tabularNums: true }}>
                  {max}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {" "}
                    / {min}
                  </Typography>
                </Typography>
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
