import { useEffect, useState } from "react";
import { Alert, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { api, type SystemInfo } from "../../../api";
import { useSkin } from "../../../skins/SkinProvider";
import { useContentSurfaceSx } from "../../../skins/useSurfaceStyles";

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SystemStatusPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { skin } = useSkin();
  const surfaceSx = useContentSurfaceSx();

  useEffect(() => {
    void api
      .system()
      .then(setInfo)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load system info")
      );
  }, []);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!info) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Card sx={surfaceSx}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Service status
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`API ${info.version}`} color="primary" />
            <Chip
              label={`DB ${info.database}`}
              color={info.database === "ok" ? "success" : "error"}
            />
            <Chip
              label={`MQTT ${info.mqtt}`}
              color={info.mqtt === "connected" ? "success" : "warning"}
            />
            <Chip label={`Uptime ${formatUptime(info.uptimeSeconds)}`} />
            <Chip label={`Skin ${skin.id}`} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1, ...surfaceSx }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Host
            </Typography>
            <Typography variant="body2">CPU: {info.cpu.model}</Typography>
            <Typography variant="body2">
              Cores: {info.cpu.cores} · Load: {info.cpu.loadPercent}%
            </Typography>
            <Typography variant="body2">
              Memory: {info.memory.usedMb} / {info.memory.totalMb} MB
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, ...surfaceSx }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Network
            </Typography>
            <Typography variant="body2">LAN: {info.lanIp ?? "—"}</Typography>
            <Typography variant="body2">WAN: {info.wanIp ?? "—"}</Typography>
            {info.mqttError && (
              <Typography variant="body2" color="error">
                MQTT error: {info.mqttError}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
