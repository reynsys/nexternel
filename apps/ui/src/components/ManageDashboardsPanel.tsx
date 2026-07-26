import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { api, type DashboardSummary } from "../api";
import { DashboardIconPicker } from "./DashboardIconPicker";
import { getDashboardIcon } from "../lib/dashboard-icons";
import { normalizeDocument } from "../lib/dashboard-document";

type Props = {
  /** Shorter chrome when embedded under Dashboard options */
  compact?: boolean;
  /** Called after create / delete / default / tab edit so the tab bar can refresh */
  onDashboardsChanged?: () => void;
};

/** Create, default, tab icons — used inside Dashboard options and on /manage/dashboards. */
export function ManageDashboardsPanel({ compact, onDashboardsChanged }: Props) {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [name, setName] = useState("Home");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("dashboard");
  const [editShowLabel, setEditShowLabel] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    try {
      const res = await api.dashboards();
      setDashboards(res.dashboards);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboards");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function notifyChanged() {
    onDashboardsChanged?.();
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.createDashboard(name.trim() || "Home");
      notifyChanged();
      navigate(`/dashboards/${res.dashboard.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this dashboard?")) return;
    try {
      await api.deleteDashboard(id);
      await load();
      notifyChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function setDefault(id: string) {
    try {
      await api.saveDashboard(id, { isDefault: true });
      await load();
      notifyChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set default");
    }
  }

  async function openEdit(d: DashboardSummary) {
    setError(null);
    try {
      const res = await api.getDashboard(d.id);
      const doc = normalizeDocument(res.dashboard.document, res.dashboard.name);
      setEditId(d.id);
      setEditName(doc.name);
      setEditIcon(doc.tabIcon ?? "dashboard");
      setEditShowLabel(doc.showTabLabel !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }

  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    setError(null);
    try {
      const res = await api.getDashboard(editId);
      const doc = normalizeDocument(res.dashboard.document, editName.trim() || "Dashboard");
      await api.saveDashboard(editId, {
        name: editName.trim() || "Dashboard",
        document: {
          ...doc,
          name: editName.trim() || "Dashboard",
          tabIcon: editIcon,
          showTabLabel: editShowLabel,
        },
      });
      setEditId(null);
      await load();
      notifyChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <Stack spacing={compact ? 1.5 : 2}>
      {!compact && (
        <Box>
          <Typography variant="h4">Manage dashboards</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Prefer the tab-bar gear → <strong>Dashboard options</strong>, which includes this
            panel. Home (<code>/</code>) always opens the default dashboard.
          </Typography>
        </Box>
      )}
      {compact && (
        <Typography variant="body2" color="text.secondary">
          Create dashboards, set the login default (star), and choose tab icons.
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {dashboards.length > 0 && !dashboards.some((d) => d.isDefault) && (
        <Alert severity="warning">
          No default dashboard yet. Click the star on a row to choose which one opens at login.
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          size="small"
          label="New dashboard name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button variant="contained" disabled={busy} onClick={() => void create()}>
          Create
        </Button>
      </Stack>

      <List dense={compact}>
        {dashboards.map((d) => {
          const Icon = getDashboardIcon(d.tabIcon);
          return (
            <ListItem
              key={d.id}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    edge="end"
                    aria-label="Open"
                    component={RouterLink}
                    to={`/dashboards/${d.id}`}
                    size="small"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label={d.isDefault ? "Default dashboard" : "Set as default"}
                    onClick={() => void setDefault(d.id)}
                    color={d.isDefault ? "primary" : "default"}
                  >
                    {d.isDefault ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="Edit tab"
                    onClick={() => void openEdit(d)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="delete"
                    onClick={() => void remove(d.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
              disablePadding
            >
              <ListItemButton component={RouterLink} to={`/dashboards/${d.id}`}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{d.name}</span>
                      {d.isDefault && <Chip size="small" label="Default" color="primary" />}
                    </Stack>
                  }
                  secondary={`Updated ${new Date(d.updatedAt).toLocaleString()}`}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
        {dashboards.length === 0 && (
          <Typography color="text.secondary">No dashboards yet — create one above.</Typography>
        )}
      </List>

      <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit dashboard tab</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              size="small"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editShowLabel}
                  onChange={(e) => setEditShowLabel(e.target.checked)}
                />
              }
              label="Show name on tab (off = icon only)"
            />
            <DashboardIconPicker value={editIcon} onChange={setEditIcon} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button variant="contained" disabled={editSaving} onClick={() => void saveEdit()}>
            {editSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
