import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, rememberAuth } from "../api";
import { useSkin } from "../skins/SkinProvider";

type Step = 1 | 2 | 3 | 4;

export function SetupPage() {
  const navigate = useNavigate();
  const { applyAccountPrefs } = useSkin();
  const [step, setStep] = useState<Step>(1);
  const [version, setVersion] = useState("");
  const [serverIp, setServerIp] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api
      .setupStatus()
      .then((status) => {
        if (!status.needsSetup) {
          navigate("/login", { replace: true });
          return;
        }
        setVersion(status.version);
        setServerIp(status.serverIp);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load setup status");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function onCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const data = await api.setupComplete({
        username: username.trim(),
        password,
        confirmPassword,
      });
      rememberAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      applyAccountPrefs(data.user.themePrefs);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
        <LinearProgress sx={{ width: 240 }} />
      </Stack>
    );
  }

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", py: 4 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Welcome to Nexternel</Typography>
            <LinearProgress
              variant="determinate"
              value={(step / 4) * 100}
              sx={{ mb: 1 }}
            />

            {step === 1 && (
              <>
                <Typography variant="body1">
                  Nexternel is being configured for this installation.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You only need to create an administrator account. Database, MQTT and other
                  service passwords are generated automatically — you do not need to manage them.
                </Typography>
                <Button variant="contained" onClick={() => setStep(2)}>
                  Continue
                </Button>
              </>
            )}

            {step === 2 && (
              <Stack spacing={2} component="form" onSubmit={onCreateAdmin}>
                <Typography variant="subtitle1">Administrator account</Typography>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  fullWidth
                  disabled={busy}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  disabled={busy}
                  autoComplete="new-password"
                />
                <TextField
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  disabled={busy}
                  autoComplete="new-password"
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" disabled={busy}>
                  {busy ? "Creating…" : "Create administrator"}
                </Button>
              </Stack>
            )}

            {step === 3 && (
              <>
                <Typography variant="subtitle1">Installation</Typography>
                <Typography variant="body2">Nexternel version: {version || "—"}</Typography>
                {serverIp && (
                  <Typography variant="body2">Server address: {serverIp}</Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  MQTT broker and topic configuration have been prepared for this server
                  automatically.
                </Typography>
                <Button variant="contained" onClick={() => setStep(4)}>
                  Continue
                </Button>
              </>
            )}

            {step === 4 && (
              <>
                <Alert severity="success">Your Nexternel installation is ready.</Alert>
                <Typography variant="body2" color="text.secondary">
                  You can restore a backup from Settings → Backup &amp; Restore, or start
                  configuring areas and devices.
                </Typography>
                <Button variant="contained" onClick={() => navigate("/", { replace: true })}>
                  Open Nexternel
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
