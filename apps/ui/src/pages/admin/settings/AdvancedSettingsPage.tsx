import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../../api";
import { useContentSurfaceSx } from "../../../skins/useSurfaceStyles";

type RepairCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
  busyLabel: string;
  busy: boolean;
  onRun: () => Promise<void>;
};

function RepairCard({
  title,
  description,
  buttonLabel,
  busyLabel,
  busy,
  onRun,
}: RepairCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Button variant="outlined" disabled={busy} onClick={() => void onRun()}>
          {busy ? busyLabel : buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Admin maintenance and repair tools (not used in normal day-to-day operation). */
export function AdvancedSettingsPage() {
  const surfaceSx = useContentSurfaceSx();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runRepair(
    key: string,
    action: () => Promise<string>
  ) {
    setBusyKey(key);
    setSuccess(null);
    setError(null);
    try {
      const message = await action();
      setSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Maintenance tools for administrators. Normal device setup does not require these. Per-device
        ESPHome changes use <strong>Sync from YAML</strong> on the{" "}
        <RouterLink to="/admin/devices">Devices</RouterLink> page.
      </Typography>

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          ...surfaceSx,
        }}
      >
        <RepairCard
          title="Sync capabilities"
          description="Rebuilds capabilities from every device's sensors and relays, re-reads all ESPHome YAML on the server, fixes MQTT topic bindings, and remaps dashboard widgets if needed. Use after a backup restore or if Live/dashboards show missing readings."
          buttonLabel="Sync capabilities"
          busyLabel="Syncing…"
          busy={busyKey === "capabilities"}
          onRun={() =>
            runRepair("capabilities", async () => {
              const res = await api.syncCapabilities();
              const pruneParts: string[] = [];
              if (res.reconcile?.removedRelays) {
                pruneParts.push(`${res.reconcile.removedRelays} ghost relay(s)`);
              }
              if (res.reconcile?.removedSensors) {
                pruneParts.push(`${res.reconcile.removedSensors} stale sensor(s)`);
              }
              if (res.prunedInternal) {
                pruneParts.push(`${res.prunedInternal} internal output(s)`);
              }
              const pruneNote =
                pruneParts.length > 0 ? ` Removed ${pruneParts.join(", ")}.` : "";
              return `Synced ${res.sensors} sensor and ${res.relays} relay capabilities.${pruneNote}`;
            })
          }
        />

        <RepairCard
          title="Repair MQTT connection"
          description="Reconnects the API to the MQTT broker and refreshes telemetry subscriptions. Use if devices show offline in Nexternel but are running on the network."
          buttonLabel="Repair MQTT"
          busyLabel="Repairing…"
          busy={busyKey === "mqtt"}
          onRun={() =>
            runRepair("mqtt", async () => {
              const res = await api.repairMqtt();
              return res.message;
            })
          }
        />

        <RepairCard
          title="Fix dashboard panels"
          description="Remaps dashboard widget capability links after adopt, restore, or capability sync. Use if panels do not respond while Live readings work, then hard-refresh the Dashboard."
          buttonLabel="Fix dashboard panels"
          busyLabel="Fixing…"
          busy={busyKey === "dashboard"}
          onRun={() =>
            runRepair("dashboard", async () => {
              const res = await api.repairDashboardBindings();
              return `Updated ${res.bindingsRemapped} panel binding(s) on ${res.dashboardsUpdated} dashboard(s). Reload the Dashboard page.`;
            })
          }
        />

        <RepairCard
          title="Repair live data"
          description="Re-aligns MQTT topic bindings and refreshes the live telemetry cache. Use if Live or widgets show stale or missing values for otherwise healthy devices."
          buttonLabel="Repair live data"
          busyLabel="Repairing…"
          busy={busyKey === "live"}
          onRun={() =>
            runRepair("live", async () => {
              const res = await api.repairLiveData();
              return res.message;
            })
          }
        />
      </Box>
    </Stack>
  );
}
