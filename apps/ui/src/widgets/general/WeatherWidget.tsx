import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { api, type WeatherResponse, type WidgetInstance } from "../../api";
import { parseWeatherConfig, widgetTitleOr } from "./config";
import { weatherEmojiForCode } from "./weather-icons";

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
      <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ mb: 0.5, flexShrink: 0 }}>
        {title}
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
            const label = new Date(day.date).toLocaleDateString(undefined, {
              weekday: "short",
            });
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
