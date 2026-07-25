import { useEffect, useState } from "react";
import {
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import {
  api,
  connectLiveSocket,
  type Capability,
  type Health,
} from "../api";

/** Dev / diagnostics page — live capability list. */
export function LivePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  function applyLive(capabilityId: string, value: unknown, quality: string, updatedAt: string) {
    setCapabilities((prev) =>
      prev.map((c) =>
        c.id === capabilityId ? { ...c, state: { value, quality, updatedAt } } : c
      )
    );
  }

  useEffect(() => {
    void (async () => {
      try {
        setHealth(await api.health());
        const caps = await api.capabilities();
        setCapabilities(caps.capabilities);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    return connectLiveSocket((ev) => {
      if (ev.type === "hello" && ev.states) {
        for (const s of ev.states) {
          applyLive(s.capabilityId, s.value, s.quality, s.updatedAt);
        }
      }
      if (ev.type === "capability.updated" && ev.state) {
        applyLive(
          ev.state.capabilityId,
          ev.state.value,
          ev.state.quality,
          ev.state.updatedAt
        );
      }
    });
  }, []);

  async function onToggle(cap: Capability) {
    setToggling(cap.id);
    setError(null);
    const previous = cap.state?.value === true;
    const next = !previous;
    applyLive(cap.id, next, "good", new Date().toISOString());
    try {
      const res = await api.command(cap.id, next ? "on" : "off");
      applyLive(cap.id, res.value, "good", new Date().toISOString());
    } catch (err) {
      applyLive(
        cap.id,
        previous,
        cap.state?.quality ?? "unknown",
        cap.state?.updatedAt ?? new Date().toISOString()
      );
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setToggling(null);
    }
  }

  function formatValue(cap: Capability): string {
    if (!cap.state) return "—";
    const v = cap.state.value;
    if (typeof v === "boolean") return v ? "ON" : "OFF";
    if (typeof v === "number") {
      const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
      return cap.unit ? `${n} ${cap.unit}` : n;
    }
    return String(v);
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Live capabilities</Typography>
      <Typography color="text.secondary">
        Raw capability feed for diagnostics. Use Dashboards for layouts.
      </Typography>
      {health && (
        <Chip
          size="small"
          color={health.status === "ok" ? "success" : "warning"}
          label={`${health.status} · ${health.version}${health.mqtt ? ` · mqtt ${health.mqtt}` : ""}`}
          sx={{ alignSelf: "start" }}
        />
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <List dense>
        {capabilities.map((c) => (
          <ListItem
            key={c.id}
            secondaryAction={
              c.kind === "switch" && c.hasCommand ? (
                <Switch
                  edge="end"
                  checked={c.state?.value === true}
                  disabled={toggling === c.id}
                  onChange={() => void onToggle(c)}
                />
              ) : null
            }
          >
            <ListItemText
              primary={`${c.name} · ${formatValue(c)}`}
              secondary={`${c.deviceName} · ${c.kind}`}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
