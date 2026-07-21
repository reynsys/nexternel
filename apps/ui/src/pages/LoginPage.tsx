import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, clearStoredTokens } from "../api";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(username.trim(), password);
      navigate("/dashboards", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function clearSavedLogin() {
    clearStoredTokens();
    setCleared(true);
    setError(null);
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 420, mx: "auto" }}>
      <Stack spacing={2} component="form" onSubmit={onSubmit}>
        <Typography variant="h5">Sign in</Typography>
        <Typography variant="body2" color="text.secondary">
          Use your admin credentials from .env (ADMIN_USERNAME / ADMIN_PASSWORD) or an account
          created under Users. Access sessions expire after about 15 minutes; the app renews
          them automatically when possible.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {cleared && (
          <Alert severity="success">Saved login cleared — sign in again.</Alert>
        )}
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
        />
        <Button type="submit" variant="contained" disabled={busy} fullWidth>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <Button type="button" onClick={clearSavedLogin} disabled={busy} fullWidth>
          Clear saved login
        </Button>
      </Stack>
    </Paper>
  );
}
