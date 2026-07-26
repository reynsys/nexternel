import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { getStoredAccessToken } from "../api";
import { resolveHomeDashboardId } from "../lib/home-dashboard";
import { APP_VERSION } from "../version";

/**
 * Opens the default dashboard via a hard navigation.
 * Used for `/` and `/dashboards` so the Manage list can never appear there.
 */
export function HomeRedirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredAccessToken()) {
      window.location.replace("/login");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const id = await resolveHomeDashboardId();
        if (cancelled) return;
        if (!id) {
          window.location.replace("/manage/dashboards");
          return;
        }
        // Hard navigate — avoids React Router soft-nav quirks leaving you on /dashboards
        window.location.replace(`/dashboards/${id}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to open dashboard");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={2}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {error}
        </Alert>
        <Button variant="contained" component={RouterLink} to="/manage/dashboards">
          Open Manage dashboards
        </Button>
        <Typography variant="caption" color="text.secondary">
          {APP_VERSION}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={2}>
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">
        Opening default dashboard…
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {APP_VERSION}
      </Typography>
    </Stack>
  );
}
