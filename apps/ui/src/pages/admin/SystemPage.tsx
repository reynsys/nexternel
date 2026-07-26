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
import { api, type SystemInfo } from "../../api";
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
  const canEditBrand = Boolean(isAdmin || permissions?.manageUsers);

  useEffect(() => {
    void api
      .system()
      .then(setInfo)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load system info")
      );
  }, []);

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
      setProfileMsg("Profile saved — sidebar updates immediately.");
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

  return (
    <Stack spacing={2}>
      <Typography variant="h4">System</Typography>
      <Typography color="text.secondary">
        Your profile, UI appearance, API host status, network, and Node-RED. This UI (:8080)
        talks to the API (:4000).
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
              {roleLabel(user.role, user.roleName)}. Role can only be changed by an
              Administrator under Users / Roles.
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
                helperText="Shown in the sidebar (bottom left)"
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
              Replaces the blue circle next to Nexternel in the side menu. Saved in this
              browser.
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
