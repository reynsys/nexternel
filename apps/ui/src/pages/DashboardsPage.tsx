import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { api, type DashboardSummary } from "../api";

export function DashboardsPage() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [name, setName] = useState("Home");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.dashboards();
      setDashboards(res.dashboards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboards");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.createDashboard(name.trim() || "Home");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Dashboards</Typography>
      <Typography color="text.secondary">
        Create layouts with drag-and-drop widgets bound to capabilities.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

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

      <List>
        {dashboards.map((d) => (
          <ListItem
            key={d.id}
            secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => void remove(d.id)}>
                <DeleteIcon />
              </IconButton>
            }
            disablePadding
          >
            <ListItemButton component={RouterLink} to={`/dashboards/${d.id}`}>
              <ListItemText
                primary={d.name}
                secondary={d.isDefault ? "Default" : `Updated ${new Date(d.updatedAt).toLocaleString()}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
        {dashboards.length === 0 && (
          <Typography color="text.secondary">No dashboards yet — create one above.</Typography>
        )}
      </List>
    </Stack>
  );
}
