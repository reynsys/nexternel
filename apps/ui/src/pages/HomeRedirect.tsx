import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { api, getStoredAccessToken } from "../api";

/**
 * Signed-in `/` → default dashboard.
 * If none is marked default, promote the first one, then open it.
 * If there are no dashboards, go to Manage to create one.
 */
export function HomeRedirect() {
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredAccessToken()) {
      setTo("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.dashboards();
        if (cancelled) return;
        const list = res.dashboards;
        if (list.length === 0) {
          setTo("/dashboards");
          return;
        }
        let target = list.find((d) => d.isDefault);
        if (!target) {
          target = list[0]!;
          try {
            await api.saveDashboard(target.id, { isDefault: true });
          } catch {
            /* still open first even if promote fails */
          }
        }
        if (cancelled) return;
        setTo(`/dashboards/${target.id}`);
      } catch {
        if (!cancelled) setTo("/dashboards");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!to) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={2}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Opening dashboard…
        </Typography>
      </Stack>
    );
  }
  return <Navigate to={to} replace />;
}
