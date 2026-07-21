import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  api,
  connectLiveSocket,
  type Capability,
  type DashboardDocument,
  type WidgetInstance,
} from "../api";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { listWidgetContributions, getWidgetContribution } from "../plugins/registry";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(GridLayout);

function newWidgetId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* http://LAN-IP is not a secure context — randomUUID throws */
  }
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nextY(widgets: WidgetInstance[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map((w) => w.layout.y + w.layout.h));
}

export function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("Dashboard");
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState("stat");
  const [addCapId, setAddCapId] = useState("");
  const [addRange, setAddRange] = useState("24h");

  function applyLive(capabilityId: string, value: unknown, quality: string, updatedAt: string) {
    setCapabilities((prev) =>
      prev.map((c) =>
        c.id === capabilityId ? { ...c, state: { value, quality, updatedAt } } : c
      )
    );
  }

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const [dash, caps] = await Promise.all([
          api.getDashboard(id),
          api.capabilities(),
        ]);
        setName(dash.dashboard.name);
        setWidgets(dash.dashboard.document.widgets ?? []);
        setCapabilities(caps.capabilities);
        if (caps.capabilities[0]) setAddCapId(caps.capabilities[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    })();
  }, [id]);

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

  const layout: Layout[] = useMemo(
    () =>
      widgets.map((w) => ({
        i: w.id,
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        minW: w.layout.minW ?? 2,
        minH: w.layout.minH ?? 2,
      })),
    [widgets]
  );

  function onLayoutChange(next: Layout[]) {
    if (!editMode) return;
    // Ignore empty/stale callbacks that would drop newly added widgets
    if (next.length === 0 && widgets.length > 0) return;
    setWidgets((prev) =>
      prev.map((w) => {
        const l = next.find((x) => x.i === w.id);
        if (!l) return w;
        return {
          ...w,
          layout: {
            i: w.id,
            x: l.x,
            y: Number.isFinite(l.y) ? l.y : w.layout.y,
            w: l.w,
            h: l.h,
            minW: l.minW,
            minH: l.minH,
          },
        };
      })
    );
  }

  function addWidget() {
    const plugin = getWidgetContribution(addType);
    const requiresCapability =
      addType === "auto" ||
      addType === "stat" ||
      addType === "switch" ||
      addType === "gauge" ||
      addType === "history" ||
      (plugin ? plugin.needsCapability !== false : false);

    if (requiresCapability && !addCapId) {
      setError("Choose a capability first");
      return;
    }
    const cap = addCapId ? capabilities.find((c) => c.id === addCapId) : undefined;
    const widgetId = newWidgetId();
    const type =
      addType === "auto"
        ? cap?.kind === "switch"
          ? "switch"
          : "stat"
        : addType;
    const w = type === "history" ? 6 : type === "gauge" || type.startsWith("plugin.") ? 4 : 3;
    const h = type === "history" ? 4 : type === "gauge" ? 4 : 3;
    const widget: WidgetInstance = {
      id: widgetId,
      type,
      title: plugin?.label || cap?.name || type,
      layout: {
        i: widgetId,
        x: 0,
        y: nextY(widgets),
        w,
        h,
        minW: type === "history" ? 3 : 2,
        minH: type === "history" ? 3 : 2,
      },
      bindings: requiresCapability && addCapId ? { capabilityId: addCapId } : {},
      config: type === "history" ? { range: addRange } : {},
    };
    setWidgets((prev) => [...prev, widget]);
    setError(null);
    setAddOpen(false);
  }

  function removeWidget(widgetId: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }

  async function save() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const document: DashboardDocument = {
        schemaVersion: 1,
        name,
        widgets,
      };
      await api.saveDashboard(id, { name, document });
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        {editMode ? (
          <TextField
            size="small"
            label="Dashboard name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <Typography variant="h4">{name}</Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="text" onClick={() => navigate("/dashboards")}>
            Back
          </Button>
          {editMode ? (
            <>
              <Button variant="outlined" onClick={() => setAddOpen(true)}>
                Add widget
              </Button>
              <Button variant="contained" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false);
                  if (id) {
                    void api.getDashboard(id).then((d) => {
                      setName(d.dashboard.name);
                      setWidgets(d.dashboard.document.widgets ?? []);
                    });
                  }
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          minHeight: 480,
          border: "1px dashed",
          borderColor: editMode ? "primary.main" : "divider",
          borderRadius: 1,
          p: 1,
          bgcolor: "background.default",
        }}
      >
        <ReactGridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={48}
          margin={[12, 12]}
          isDraggable={editMode}
          isResizable={editMode}
          onLayoutChange={onLayoutChange}
          draggableHandle=".widget-drag-handle"
        >
          {widgets.map((w) => (
            <div key={w.id} style={{ height: "100%" }}>
              <Box sx={{ height: "100%", position: "relative" }}>
                {editMode && (
                  <Stack
                    direction="row"
                    spacing={1}
                    className="widget-drag-handle"
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      zIndex: 2,
                      cursor: "move",
                    }}
                  >
                    <Button size="small" color="error" onClick={() => removeWidget(w.id)}>
                      Remove
                    </Button>
                  </Stack>
                )}
                <WidgetRenderer
                  widget={w}
                  capabilities={capabilities}
                  editMode={editMode}
                />
              </Box>
            </div>
          ))}
        </ReactGridLayout>
        {widgets.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            {editMode
              ? "No widgets yet — click Add widget."
              : "Empty dashboard — click Edit to add widgets."}
          </Typography>
        )}
      </Box>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add widget</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="widget-type">Type</InputLabel>
              <Select
                labelId="widget-type"
                label="Type"
                value={addType}
                onChange={(e) => {
                  const next = e.target.value;
                  setAddType(next);
                  if (next === "history" && addCapId) {
                    const cap = capabilities.find((c) => c.id === addCapId);
                    if (cap?.kind === "switch") {
                      const first = capabilities.find((c) => c.kind !== "switch");
                      if (first) setAddCapId(first.id);
                    }
                  }
                }}
              >
                <MenuItem value="auto">Auto (switch or stat)</MenuItem>
                <MenuItem value="stat">Stat</MenuItem>
                <MenuItem value="switch">Switch</MenuItem>
                <MenuItem value="gauge">Gauge</MenuItem>
                <MenuItem value="history">History chart</MenuItem>
                {listWidgetContributions().map((p) => (
                  <MenuItem key={p.type} value={p.type}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {addType === "history" && (
              <FormControl fullWidth>
                <InputLabel id="hist-range">Range</InputLabel>
                <Select
                  labelId="hist-range"
                  label="Range"
                  value={addRange}
                  onChange={(e) => setAddRange(e.target.value)}
                >
                  <MenuItem value="1h">Last 1 hour</MenuItem>
                  <MenuItem value="6h">Last 6 hours</MenuItem>
                  <MenuItem value="24h">Last 24 hours</MenuItem>
                  <MenuItem value="7d">Last 7 days</MenuItem>
                </Select>
              </FormControl>
            )}
            {!(
              getWidgetContribution(addType)?.needsCapability === false
            ) && (
            <FormControl fullWidth>
              <InputLabel id="cap">Capability</InputLabel>
              <Select
                labelId="cap"
                label="Capability"
                value={addCapId}
                onChange={(e) => setAddCapId(e.target.value)}
              >
                {(addType === "history"
                  ? capabilities.filter((c) => c.kind !== "switch")
                  : capabilities
                ).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.deviceName} · {c.name} ({c.kind})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              try {
                addWidget();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add widget");
              }
            }}
            disabled={
              getWidgetContribution(addType)?.needsCapability === false
                ? false
                : !addCapId
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
