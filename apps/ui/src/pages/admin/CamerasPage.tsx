import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import {
  api,
  type CameraBrandPreset,
  type CameraRecord,
} from "../../api";
import { AREA } from "../../lib/area-labels";

type AreaOption = { id: string; name: string };

const emptyForm = {
  name: "",
  streamId: "",
  rtspUrl: "",
  areaId: "",
  enabled: true,
  sortOrder: "0",
  brandPreset: "",
  host: "",
  user: "",
  password: "",
};

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [presets, setPresets] = useState<CameraBrandPreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CameraRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CameraRecord | null>(null);

  async function load() {
    try {
      const [camRes, roomRes, me, presetRes] = await Promise.all([
        api.cameras(),
        api.rooms(),
        api.me(),
        api.cameraPresets().catch(() => ({ presets: [] as CameraBrandPreset[] })),
      ]);
      setCameras(camRes.cameras);
      setAreas(roomRes.rooms.map((r) => ({ id: r.id, name: r.name })));
      setPresets(presetRes.presets);
      setCanEdit(
        Boolean(me.user.permissions?.editDevices ?? me.user.isAdmin ?? me.user.role === "admin")
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cameras");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === form.brandPreset) ?? null,
    [presets, form.brandPreset]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(cam: CameraRecord) {
    setEditing(cam);
    setForm({
      ...emptyForm,
      name: cam.name,
      streamId: cam.streamId,
      rtspUrl: cam.rtspUrl ?? "",
      areaId: cam.areaId ?? "",
      enabled: cam.enabled,
      sortOrder: String(cam.sortOrder),
    });
    setDialogOpen(true);
    // Refresh full record so RTSP URL is populated for editors
    void api
      .getCamera(cam.id)
      .then((r) => {
        setEditing(r.camera);
        setForm((f) => ({
          ...f,
          name: r.camera.name,
          streamId: r.camera.streamId,
          rtspUrl: r.camera.rtspUrl ?? f.rtspUrl,
          areaId: r.camera.areaId ?? "",
          enabled: r.camera.enabled,
          sortOrder: String(r.camera.sortOrder),
        }));
      })
      .catch(() => {
        /* keep list row data */
      });
  }

  function applyPresetPath() {
    if (!selectedPreset || !form.host.trim()) return;
    const user = encodeURIComponent(form.user.trim() || "user");
    const password = encodeURIComponent(form.password || "password");
    const host = form.host.trim();
    const path = selectedPreset.pathTemplate.startsWith("/")
      ? selectedPreset.pathTemplate
      : `/${selectedPreset.pathTemplate}`;
    setForm((f) => ({
      ...f,
      rtspUrl: `rtsp://${user}:${password}@${host}:554${path}`,
    }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const streamId = form.streamId.trim() || slugFromName(form.name);
      const sortOrder = Number(form.sortOrder);
      if (editing) {
        await api.updateCamera(editing.id, {
          name: form.name.trim(),
          streamId,
          rtspUrl: form.rtspUrl.trim() || undefined,
          areaId: form.areaId.trim() || null,
          enabled: form.enabled,
          sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        });
        setInfo(`Updated ${form.name.trim()}.`);
      } else {
        if (!form.rtspUrl.trim()) {
          setError("RTSP URL is required");
          setBusy(false);
          return;
        }
        await api.createCamera({
          name: form.name.trim(),
          streamId,
          rtspUrl: form.rtspUrl.trim(),
          areaId: form.areaId.trim() || null,
          enabled: form.enabled,
          sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        });
        setInfo(`Added ${form.name.trim()}.`);
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.deleteCamera(deleteTarget.id);
      setDeleteTarget(null);
      setInfo(`Deleted ${deleteTarget.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={1}
      >
        <Typography variant="h4">Cameras</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<VideocamRoundedIcon />}
            onClick={openCreate}
          >
            Add camera
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary">
        Register CCTV cameras by RTSP URL. Live streams are converted for the dashboard by
        go2rtc (port 1984). Prefer a sub-stream for tiles.
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ px: { xs: 1, sm: 2 }, "&:last-child": { pb: 2 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Stream id</TableCell>
                <TableCell>{AREA.singular}</TableCell>
                <TableCell>Enabled</TableCell>
                {canEdit && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {cameras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4}>
                    <Typography color="text.secondary">
                      No cameras yet.
                      {canEdit ? " Use “Add camera” with an RTSP URL from your CCTV." : ""}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                cameras.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {c.streamId}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.areaName ?? "—"}</TableCell>
                    <TableCell>{c.enabled ? "Yes" : "No"}</TableCell>
                    {canEdit && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label="Edit camera"
                          onClick={() => openEdit(c)}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="Delete camera"
                          color="error"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => !busy && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={(e) => void onSave(e)}>
          <DialogTitle>{editing ? "Edit camera" : "Add camera"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    streamId:
                      !editing && (!f.streamId || f.streamId === slugFromName(f.name))
                        ? slugFromName(name)
                        : f.streamId,
                  }));
                }}
                required
                fullWidth
                autoFocus
                placeholder="e.g. Driveway"
              />
              <TextField
                label="Stream id"
                value={form.streamId}
                onChange={(e) => setForm((f) => ({ ...f, streamId: e.target.value }))}
                required
                fullWidth
                helperText="Short id used by go2rtc (letters, numbers, - _)"
              />
              <FormControl fullWidth>
                <InputLabel id="cam-area">{AREA.singular}</InputLabel>
                <Select
                  labelId="cam-area"
                  label={AREA.singular}
                  value={form.areaId}
                  onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {areas.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!editing && (
                <>
                  <Typography variant="subtitle2">Optional brand helper</Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="cam-brand">Brand preset</InputLabel>
                    <Select
                      labelId="cam-brand"
                      label="Brand preset"
                      value={form.brandPreset}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, brandPreset: e.target.value }))
                      }
                    >
                      <MenuItem value="">
                        <em>None — paste full RTSP URL</em>
                      </MenuItem>
                      {presets.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedPreset && (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        {selectedPreset.hint}
                      </Typography>
                      <TextField
                        label="Camera IP / host"
                        size="small"
                        value={form.host}
                        onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                        fullWidth
                      />
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          label="Username"
                          size="small"
                          value={form.user}
                          onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                          fullWidth
                        />
                        <TextField
                          label="Password"
                          size="small"
                          type="password"
                          value={form.password}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, password: e.target.value }))
                          }
                          fullWidth
                        />
                      </Stack>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={applyPresetPath}
                        sx={{ alignSelf: "flex-start" }}
                      >
                        Build RTSP URL
                      </Button>
                    </Stack>
                  )}
                </>
              )}

              <TextField
                label="RTSP URL"
                value={form.rtspUrl}
                onChange={(e) => setForm((f) => ({ ...f, rtspUrl: e.target.value }))}
                required={!editing}
                fullWidth
                multiline
                minRows={2}
                placeholder="rtsp://user:pass@192.168.1.50:554/…"
                helperText={
                  editing
                    ? "Shown for editors so you can review or change it. Leave unchanged to keep the same stream."
                    : "Stored on the server. Prefer a sub-stream URL for dashboard tiles."
                }
              />
              <TextField
                label="Sort order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.enabled}
                    onChange={(_, checked) => setForm((f) => ({ ...f, enabled: checked }))}
                  />
                }
                label="Enabled (register stream with go2rtc)"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !busy && setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete camera</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? Dashboard widgets bound to it will
            stop showing video until reconfigured.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={busy}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
