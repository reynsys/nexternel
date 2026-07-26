import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { api, type SystemInfo, type WidgetInstance } from "../../api";
import { generalWidgetHeading } from "./config";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="caption"
        fontWeight={600}
        noWrap
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export function SystemInfoWidget({ widget }: { widget: WidgetInstance }) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const title = generalWidgetHeading(widget, "System");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.system();
        if (!cancelled) {
          setInfo(res);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const mem = info?.memory;
  const memPercent =
    mem?.percent != null
      ? mem.percent
      : mem && mem.totalMb > 0
        ? Math.round((mem.usedMb / mem.totalMb) * 100)
        : null;

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
      <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ mb: 0.75, flexShrink: 0 }}>
        {title}
      </Typography>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <Stack spacing={0.5} sx={{ flex: 1, justifyContent: "center", minHeight: 0 }}>
        <Row label="Version" value={info?.version ?? "—"} />
        <Row label="Uptime" value={info ? formatUptime(info.uptimeSeconds) : "—"} />
        <Row
          label="CPU"
          value={info ? `${info.cpu.loadPercent}%` : "—"}
        />
        <Row label="RAM" value={memPercent != null ? `${memPercent}%` : "—"} />
        <Row
          label="Temperature"
          value={
            info?.temperatureC != null && Number.isFinite(info.temperatureC)
              ? `${info.temperatureC}°C`
              : "—"
          }
        />
      </Stack>
    </Box>
  );
}
