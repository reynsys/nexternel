import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, type AdoptConfigResponse } from "../../../api";
import { useContentSurfaceSx } from "../../../skins/useSurfaceStyles";

export function BackupRestoreSection() {
  const surfaceSx = useContentSurfaceSx();
  const adoptFileRef = useRef<HTMLInputElement>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const [adoptFile, setAdoptFile] = useState<File | null>(null);
  const [newBrokerIp, setNewBrokerIp] = useState("");
  const [newTopicRoot, setNewTopicRoot] = useState("nexternel");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [adoptBusy, setAdoptBusy] = useState(false);
  const [adoptMsg, setAdoptMsg] = useState<string | null>(null);
  const [adoptErr, setAdoptErr] = useState<string | null>(null);
  const [adoptResult, setAdoptResult] = useState<AdoptConfigResponse | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [repairBusy, setRepairBusy] = useState(false);

  useEffect(() => {
    void api
      .configStatus()
      .then((s) => {
        setNewBrokerIp((prev) => prev || s.currentServerIp || "");
        if (s.mqttTopicPrefix) setNewTopicRoot(s.mqttTopicPrefix);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  async function onExportConfig() {
    setExportBusy(true);
    setExportMsg(null);
    setExportErr(null);
    try {
      const { blob, filename } = await api.downloadConfigExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`Backup saved as ${filename}`);
    } catch (err) {
      setExportErr(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setExportBusy(false);
    }
  }

  async function onAdopt() {
    if (!adoptFile) {
      setAdoptErr("Choose a backup file (.nexcfg) first.");
      return;
    }
    if (!newBrokerIp.trim()) {
      setAdoptErr("Enter this server’s LAN IP (MQTT broker address).");
      return;
    }
    if (!newTopicRoot.trim()) {
      setAdoptErr("Enter the MQTT topic root (e.g. nexternel).");
      return;
    }
    const ok = window.confirm(
      "Restore will load areas, devices, dashboards, and cameras from the backup.\n\n" +
        "MQTT topics will be updated to the topic root you entered.\n" +
        "ESPHome YAML will be updated for this server’s broker and MQTT login.\n\n" +
        "Server passwords (.env, Postgres, Mosquitto) are not changed.\n" +
        "ESP32 boards still need a USB flash afterward if they are not already on this network.\n\n" +
        "Continue?"
    );
    if (!ok) return;

    setAdoptBusy(true);
    setAdoptMsg(null);
    setAdoptErr(null);
    setAdoptResult(null);
    try {
      const result = await api.adoptConfig({
        file: adoptFile,
        newBrokerIp: newBrokerIp.trim(),
        newTopicRoot: newTopicRoot.trim(),
        wifiSsid: wifiSsid.trim() || undefined,
        wifiPassword: wifiPassword || undefined,
      });
      setAdoptResult(result);
      const c = result.counts;
      setAdoptMsg(
        `Restored ${c.rooms} areas, ${c.devices} devices, ${c.dashboards} dashboards, ${c.cameras} cameras` +
          (c.esphomeFiles ? `, ${c.esphomeFiles} ESPHome files` : "") +
          `. Topic root: ${result.adoptChecklist.topicRoot ?? newTopicRoot}.`
      );
    } catch (err) {
      setAdoptErr(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setAdoptBusy(false);
    }
  }

  async function onDownloadCutoverPack() {
    setPackBusy(true);
    setAdoptErr(null);
    try {
      const { blob, filename } = await api.downloadEsphomeCutoverPack();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setAdoptMsg(
        `Downloaded ${filename}. Open the flash-ready YAML files — broker IP and Wi‑Fi are filled in. Install via USB in ESPHome or web.esphome.io.`
      );
    } catch (err) {
      setAdoptErr(err instanceof Error ? err.message : "YAML pack download failed");
    } finally {
      setPackBusy(false);
    }
  }

  async function onRepairDashboardBindings() {
    setRepairBusy(true);
    setAdoptErr(null);
    try {
      const res = await api.repairDashboardBindings();
      setAdoptMsg(
        `Dashboard widgets updated (${res.bindingsRemapped} fixed on ${res.dashboardsUpdated} dashboard(s)). Reload the Dashboard page.`
      );
    } catch (err) {
      setAdoptErr(err instanceof Error ? err.message : "Could not fix dashboard widgets");
    } finally {
      setRepairBusy(false);
    }
  }

  return (
    <Card sx={surfaceSx}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Backup / Restore
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Save areas, devices, dashboards, cameras, and ESPHome YAML to a backup file, or restore
          that file onto this server. This does not replace server passwords or Node-RED/Influx.
          After restore, ESP32 boards may still need a USB flash so they use this broker and Wi‑Fi.
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              1. Backup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Download a <code>.nexcfg</code> file you can keep or move to another Nexternel server.
            </Typography>
            <Button
              variant="contained"
              onClick={() => void onExportConfig()}
              disabled={exportBusy}
            >
              {exportBusy ? "Creating backup…" : "Create backup"}
            </Button>
            {exportMsg && (
              <Alert severity="success" sx={{ mt: 1 }}>
                {exportMsg}
              </Alert>
            )}
            {exportErr && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {exportErr}
              </Alert>
            )}
          </Box>

          <Typography variant="subtitle2" sx={{ pt: 1 }}>
            2. Restore
          </Typography>
          <Alert severity="info">
            Restore updates areas, devices, dashboards, cameras, and ESPHome YAML. It does not change
            .env, Mosquitto, Postgres, Influx, Node-RED, or user accounts on this server.
          </Alert>
          <input
            ref={adoptFileRef}
            type="file"
            accept=".nexcfg,application/zip"
            hidden
            onChange={(e) => {
              setAdoptFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
            <Button variant="outlined" onClick={() => adoptFileRef.current?.click()}>
              Choose backup file
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
              {adoptFile ? adoptFile.name : "No file selected"}
            </Typography>
          </Stack>
          <TextField
            label="MQTT broker IP"
            value={newBrokerIp}
            onChange={(e) => setNewBrokerIp(e.target.value)}
            fullWidth
            helperText="This server’s LAN IP (devices will use this as the MQTT broker)"
          />
          <TextField
            label="MQTT topic root"
            value={newTopicRoot}
            onChange={(e) => setNewTopicRoot(e.target.value)}
            fullWidth
            helperText="First part of every device topic, e.g. nexternel"
          />
          <TextField
            label="Wi‑Fi SSID (optional)"
            value={wifiSsid}
            onChange={(e) => setWifiSsid(e.target.value)}
            fullWidth
            helperText="Only if devices must join a different Wi‑Fi after flashing"
          />
          <TextField
            label="Wi‑Fi password (optional)"
            type="password"
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            color="primary"
            disabled={adoptBusy || !adoptFile}
            onClick={() => void onAdopt()}
            sx={{ alignSelf: "flex-start" }}
          >
            {adoptBusy ? "Restoring…" : "Restore backup"}
          </Button>
          {adoptMsg && <Alert severity="success">{adoptMsg}</Alert>}
          {adoptErr && <Alert severity="error">{adoptErr}</Alert>}
          {adoptResult && (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Next: flash ESP32 devices (USB)
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, mb: 1 }}>
                {adoptResult.adoptChecklist.steps.map((s) => (
                  <li key={s}>
                    <Typography variant="body2">{s}</Typography>
                  </li>
                ))}
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
                <Button
                  variant="contained"
                  href={adoptResult.adoptChecklist.esphomeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open ESPHome
                </Button>
                <Button
                  variant="outlined"
                  disabled={packBusy}
                  onClick={() => void onDownloadCutoverPack()}
                >
                  {packBusy ? "Preparing…" : "Download device YAML pack"}
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ mb: 1 }}>
                The YAML pack has broker IP, Wi‑Fi, and MQTT password filled in. For each device: USB
                cable → ESPHome → Install → Plug into this computer (or use web.esphome.io). Broker:{" "}
                {adoptResult.adoptChecklist.brokerIp}; topics under{" "}
                {adoptResult.adoptChecklist.topicRoot ?? "…"}/.
              </Typography>
              {adoptResult.adoptChecklist.devices.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Devices in this backup
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {adoptResult.adoptChecklist.devices.map((d) => (
                      <li key={d.slug}>
                        <Typography variant="body2">
                          {d.name}
                          {d.topicPrefix ? ` — ${d.topicPrefix}` : ""}
                          {d.yamlHint ? ` (${d.yamlHint})` : ""}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                </>
              )}
            </Alert>
          )}

          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Fix dashboard widgets
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              After a restore, some dashboard switches or charts may not respond even though Live
              works. This reconnects those widgets to the correct devices. Use once if needed, then
              reload the Dashboard.
            </Typography>
            <Button
              variant="outlined"
              disabled={repairBusy}
              onClick={() => void onRepairDashboardBindings()}
            >
              {repairBusy ? "Fixing…" : "Fix dashboard widgets"}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
