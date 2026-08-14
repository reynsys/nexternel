import { useEffect, useMemo, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { api, type DeviceRecord, type WidgetInstance } from "../../api";
import { parseDeviceStatusConfig } from "./config";
import { useWidgetBodyHeading } from "./heading";
import { formatLastSeen } from "../../lib/device-utils";

export function DeviceStatusWidget({ widget }: { widget: WidgetInstance }) {
  const { offlineOnly } = parseDeviceStatusConfig(widget.config);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const title = useWidgetBodyHeading(widget, "Devices");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.devices();
        if (!cancelled) {
          setDevices(res.devices);
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

  const online = devices.filter((d) => d.isOnline && d.isEnabled).length;
  const offline = devices.filter((d) => !d.isOnline && d.isEnabled).length;
  const disabled = devices.filter((d) => !d.isEnabled).length;

  const list = useMemo(() => {
    const sorted = [...devices].sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    if (offlineOnly) return sorted.filter((d) => !d.isOnline);
    return sorted;
  }, [devices, offlineOnly]);

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
      {title && (
        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ mb: 0.5, flexShrink: 0 }}>
          {title}
        </Typography>
      )}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75, flexShrink: 0 }}>
        <Chip size="small" color="success" label={`${online} online`} />
        <Chip size="small" color={offline ? "warning" : "default"} label={`${offline} offline`} />
        {disabled > 0 && <Chip size="small" label={`${disabled} disabled`} />}
      </Stack>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {list.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {offlineOnly ? "No offline devices." : "No devices registered."}
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {list.map((d) => (
              <Stack
                key={d.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{
                  px: 0.75,
                  py: 0.35,
                  borderRadius: 1,
                  bgcolor: (t) =>
                    t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "grey.50",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={600} noWrap display="block">
                    {d.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {d.roomName ?? "No area"} · {formatLastSeen(d.lastSeenAt)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={!d.isEnabled ? "off" : d.isOnline ? "on" : "out"}
                  color={!d.isEnabled ? "default" : d.isOnline ? "success" : "warning"}
                  sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" } }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
