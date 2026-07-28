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
      setExportMsg(`Downloaded ${filename}`);
    } catch (err) {
      setExportErr(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  async function onAdopt() {
    if (!adoptFile) {
      setAdoptErr("Choose a .nexcfg file first.");
      return;
    }
    if (!newBrokerIp.trim()) {
      setAdoptErr("Enter the new MQTT broker IP (this server’s LAN IP).");
      return;
    }
    if (!newTopicRoot.trim()) {
      setAdoptErr("Enter the new MQTT topic root (e.g. nexternel).");
      return;
    }
    const ok = window.confirm(
      "Adopt will import areas, devices, dashboards, and cameras.\n\n" +
        "MQTT topics will be remapped to your new topic root.\n" +
        "ESPHome YAML will be rewritten for this broker/user/pass.\n\n" +
        "Devices on another network will NOT appear in ESPHome here until you OTA them from the OLD server (cutover pack) or USB.\n\nContinue?"
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
        `Adopted ${c.rooms} areas, ${c.devices} devices, ${c.dashboards} dashboards, ${c.cameras} cameras` +
          (c.esphomeFiles ? `, ${c.esphomeFiles} ESPHome files` : "") +
          `. Topic root: ${result.adoptChecklist.topicRoot ?? newTopicRoot}.`
      );
    } catch (err) {
      setAdoptErr(err instanceof Error ? err.message : "Adopt failed");
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
      setAdoptMsg(`Downloaded ${filename} — open flash-ready/*.yaml; broker IP is written in the file. Flash via USB or web.esphome.io.`);
    } catch (err) {
      setAdoptErr(err instanceof Error ? err.message : "Cutover pack failed");
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
        `Repaired dashboard bindings: ${res.bindingsRemapped} widget(s) remapped across ${res.dashboardsUpdated} dashboard(s). Reload the Dashboard tab.`
      );
    } catch (err) {
      setAdoptErr(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setRepairBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">System</Typography>
      <Typography color="text.secondary">
        Profile, appearance, host status, export/adopt configuration, and automations.
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
              Export &amp; adopt
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>1 — Adopt</strong> imports areas/devices/dashboards into this
              database and writes ready-to-flash ESPHome YAML here (new broker, user/pass,
              topic root
              {wifiSsid ? ", Wi‑Fi" : ""}).
              <br />
              <strong>2 — Flash</strong> each ESP32 with a USB cable from{" "}
              <em>this</em> server&apos;s ESPHome (or web.esphome.io). You do{" "}
              <strong>not</strong> need the old server. Wireless OTA from here only works
              after a device is already on this network.
            </Typography>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Fix dashboard switches after Adopt
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  If Live controls work but Dashboard switches do nothing, widget bindings
                  still point at old IDs. Run this once, then reload the Dashboard.
                </Typography>
                <Button
                  variant="outlined"
                  disabled={repairBusy}
                  onClick={() => void onRepairDashboardBindings()}
                >
                  {repairBusy ? "Repairing…" : "Repair dashboard bindings"}
                </Button>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  1. Export (on the old server)
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => void onExportConfig()}
                  disabled={exportBusy}
                >
                  {exportBusy ? "Exporting…" : "Export configuration"}
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
                2. Adopt (on the new server)
              </Typography>
              <Alert severity="info">
                Does not overwrite .env, Mosquitto, Postgres, Influx, or Node-RED.
                Users/roles on this server stay as they are.
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
                  Choose .nexcfg file
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                  {adoptFile ? adoptFile.name : "No file selected"}
                </Typography>
              </Stack>
              <TextField
                label="New MQTT broker IP"
                value={newBrokerIp}
                onChange={(e) => setNewBrokerIp(e.target.value)}
                fullWidth
                helperText="This server’s LAN IP (e.g. 192.168.3.101)"
              />
              <TextField
                label="New MQTT topic root"
                value={newTopicRoot}
                onChange={(e) => setNewTopicRoot(e.target.value)}
                fullWidth
                helperText='Replaces the first segment of all topics, e.g. damnhome/garden-relays → nexternel/garden-relays'
              />
              <TextField
                label="New Wi‑Fi SSID (optional, for cutover pack)"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                fullWidth
                helperText="If devices must join a different Wi‑Fi, set this before Adopt so the cutover YAML includes it"
              />
              <TextField
                label="New Wi‑Fi password (optional)"
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
                {adoptBusy ? "Adopting…" : "Adopt configuration"}
              </Button>
              {adoptMsg && <Alert severity="success">{adoptMsg}</Alert>}
              {adoptErr && <Alert severity="error">{adoptErr}</Alert>}
              {adoptResult && (
                <Alert severity="warning">
                  <Typography variant="subtitle2" gutterBottom>
                    Flash devices with the new config (USB — no old server)
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
                      Open ESPHome on this server
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={packBusy}
                      onClick={() => void onDownloadCutoverPack()}
                    >
                      {packBusy ? "Preparing…" : "Download flash-ready YAML pack"}
                    </Button>
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    The pack contains YAML with <strong>broker IP, Wi‑Fi, and MQTT
                    password filled in</strong> (you will see the IP in the file).
                    Flash each device: USB → ESPHome Install →{" "}
                    <strong>Plug into this computer</strong>, or use web.esphome.io.
                    After flash it uses broker {adoptResult.adoptChecklist.brokerIp} and
                    topics under {adoptResult.adoptChecklist.topicRoot ?? "…"}/.
                  </Typography>
                  {adoptResult.adoptChecklist.devices.length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Devices to flash
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
