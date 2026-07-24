import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { api, type SystemInfo } from "../../api";
import { useSkin } from "../../skins/SkinProvider";

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { skin, skins, setSkinId } = useSkin();

  useEffect(() => {
    void api
      .system()
      .then(setInfo)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load system info")
      );
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">System</Typography>
      <Typography color="text.secondary">
        API host status, network, Node-RED, and UI appearance (skins / templates).
        This UI (:8080) talks to the API (:4000).
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Prefer the floating <strong>Theme</strong> button (bottom-right) for light/dark
            and accent colour. Skins below change the layout chrome. Choices are saved in
            this browser only.
          </Typography>
          <FormControl>
            <FormLabel id="skin-label">Active template / skin</FormLabel>
            <RadioGroup
              aria-labelledby="skin-label"
              value={skin.id}
              onChange={(e) => setSkinId(e.target.value)}
            >
              {skins.map((s) => (
                <FormControlLabel
                  key={s.id}
                  value={s.id}
                  control={<Radio />}
                  label={
                    <Stack spacing={0}>
                      <Typography variant="body1">{s.label}</Typography>
                      {s.description && (
                        <Typography variant="caption" color="text.secondary">
                          {s.description}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            Soft UI Pro configurator HTML is a <strong>paid demo</strong> — do not copy it
            into this repo. After you purchase Soft UI Pro, place an adapter under{" "}
            <code>apps/ui/src/skins/local/</code> (excluded from GitHub). Free MUI templates
            in <code>Template/</code> are reference only.
          </Alert>
        </CardContent>
      </Card>

      {info && (
        <>
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
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Card sx={{ flex: 1 }}>
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
            <Card sx={{ flex: 1 }}>
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
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Automations
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Node-RED remains the automation runtime (port {info.nodeRedPort}).
                </Typography>
                <Button
                  variant="contained"
                  href={info.nodeRedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Node-RED
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </>
      )}
    </Stack>
  );
}
