import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, type AdoptConfigResponse, type SystemInfo } from "../../api";
import { UserAvatarField } from "../../components/UserAvatarField";
import { notifyUserUpdated } from "../../lib/user-events";
import { roleLabel } from "../../lib/user-display";
import { useSkin } from "../../skins/SkinProvider";
import { ThemeOptionsPanel } from "../../skins/ThemeOptionsPanel";
import { useShellAuth } from "../../skins/useShellAuth";
import {
  fileToBrandLogoDataUrl,
  getBrandLogo,
  setBrandLogo,
} from "../../skins/brandLogo";

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
  const { skin } = useSkin();
  const { user, signedIn, isAdmin, permissions } = useShellAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [brandLogo, setBrandLogoState] = useState<string | null>(() => getBrandLogo());
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const adoptFileRef = useRef<HTMLInputElement>(null);
  const canEditBrand = Boolean(isAdmin || permissions?.manageUsers);
  const canMigrate = Boolean(isAdmin || permissions?.manageUsers);

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
      .system()
      .then(setInfo)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load system info")
      );
  }, []);

  useEffect(() => {
    if (!canMigrate) return;
    void api
      .configStatus()
      .then((s) => {
        setNewBrokerIp((prev) => prev || s.currentServerIp || "");
        if (s.mqttTopicPrefix) setNewTopicRoot(s.mqttTopicPrefix);
      })
      .catch(() => {
        /* ignore */
      });
  }, [canMigrate]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    setAvatarData(user.avatarData ?? null);
  }, [user]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      await api.patchMe({
        displayName: displayName.trim() || null,
        avatarData,
      });
      notifyUserUpdated();
      setProfileMsg("Profile saved.");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProfileBusy(false);
    }
  }

  async function onBrandFile(file: File | undefined) {
    if (!file) return;
    setBrandMsg(null);
    try {
      const dataUrl = await fileToBrandLogoDataUrl(file);
      setBrandLogo(dataUrl);
      setBrandLogoState(dataUrl);
      setBrandMsg("Logo updated in the side menu.");
      window.dispatchEvent(new Event("nexternel:brand-logo-updated"));
    } catch (err) {
      setBrandMsg(err instanceof Error ? err.message : "Could not load image");
    }
  }

  function clearBrandLogo() {
    setBrandLogo(null);
    setBrandLogoState(null);
    setBrandMsg("Logo reset to the default blue mark.");
    window.dispatchEvent(new Event("nexternel:brand-logo-updated"));
  }

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
    <Stack spacing={2}>
      <Typography variant="h4">System</Typography>
      <Typography color="text.secondary">
        Profile, appearance, host status, backup/restore, and automations.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      {signedIn && user && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              My profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Username <strong>{user.username}</strong> ·{" "}
              {roleLabel(user.role, user.roleName)}. An administrator can change your role
              under Users.
            </Typography>
            <Stack
              component="form"
              spacing={2}
              onSubmit={(e) => void onSaveProfile(e)}
            >
              <UserAvatarField
                avatarData={avatarData}
                displayName={displayName}
                username={user.username}
                onChange={setAvatarData}
              />
              <TextField
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                helperText="Shown next to your name in the side menu"
              />
              {profileErr && <Alert severity="error">{profileErr}</Alert>}
              {profileMsg && <Alert severity="success">{profileMsg}</Alert>}
              <Button type="submit" variant="contained" disabled={profileBusy} sx={{ alignSelf: "flex-start" }}>
                Save profile
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {canEditBrand && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Brand logo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Logo shown next to Nexternel in the side menu.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              {brandLogo ? (
                <Box
                  component="img"
                  src={brandLogo}
                  alt="Brand"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "999px",
                    objectFit: "cover",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "999px",
                    backgroundImage:
                      "linear-gradient(135deg, hsl(210, 98%, 60%) 0%, hsl(210, 100%, 35%) 100%)",
                    border: "1px solid",
                    borderColor: "primary.main",
                  }}
                />
              )}
              <input
                ref={brandInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  void onBrandFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outlined"
                onClick={() => brandInputRef.current?.click()}
              >
                Upload logo
              </Button>
              {brandLogo && (
                <Button color="inherit" onClick={clearBrandLogo}>
                  Reset default
                </Button>
              )}
            </Stack>
            {brandMsg && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {brandMsg}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <ThemeOptionsPanel />
        </CardContent>
      </Card>

      {canMigrate && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Backup / Restore
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Save areas, devices, dashboards, cameras, and ESPHome YAML to a backup
              file, or restore that file onto this server. This does not replace server
              passwords or Node-RED/Influx. After restore, ESP32 boards may still need a
              USB flash so they use this broker and Wi‑Fi.
            </Typography>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  1. Backup
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Download a <code>.nexcfg</code> file you can keep or move to another
                  Nexternel server.
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
                Restore updates areas, devices, dashboards, cameras, and ESPHome YAML.
                It does not change .env, Mosquitto, Postgres, Influx, Node-RED, or user
                accounts on this server.
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
                    The YAML pack has broker IP, Wi‑Fi, and MQTT password filled in.
                    For each device: USB cable → ESPHome → Install → Plug into this
                    computer (or use web.esphome.io). Broker:{" "}
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
                  After a restore, some dashboard switches or charts may not respond even
                  though Live works. This reconnects those widgets to the correct devices.
                  Use once if needed, then reload the Dashboard.
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
      )}

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
                  Open the automation editor to create and manage flows.
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
