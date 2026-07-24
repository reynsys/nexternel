import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Link,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import {
  api,
  type DeviceRecord,
  type EsphomeCatalogEntry,
  type EsphomeImportSuggestion,
} from "../../api";
import { AREA } from "../../lib/area-labels";
import {
  esphomeDashboardUrl,
  formatLastSeen,
  friendlyDeviceName,
} from "../../lib/device-utils";

type AreaOption = { id: string; name: string };

const emptyForm = {
  esphomeFile: "",
  name: "",
  roomId: "",
  mqttTopicPrefix: "",
  esphomeName: "",
  ipAddress: "",
};

export function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [catalog, setCatalog] = useState<EsphomeCatalogEntry[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hostname, setHostname] = useState("localhost");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imported, setImported] = useState<EsphomeImportSuggestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceRecord | null>(null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  async function load() {
    try {
      const [devRes, roomRes, me, catRes] = await Promise.all([
        api.devices(),
        api.rooms(),
        api.me(),
        api.esphomeCatalog().catch(() => ({ configs: [], esphomeDirHint: null })),
      ]);
      setDevices(devRes.devices);
      setAreas(roomRes.rooms.map((r) => ({ id: r.id, name: r.name })));
      setIsAdmin(me.user.role === "admin");
      setCatalog(catRes.configs);
      setCatalogHint(catRes.esphomeDirHint);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const unregistered = useMemo(
    () => catalog.filter((c) => !c.registered),
    [catalog]
  );

  function openCreate(fileName?: string) {
    setEditing(null);
    setForm(emptyForm);
    setImported(null);
    setDialogOpen(true);
    if (fileName) void applyEsphomeImport(fileName);
  }

  function openEdit(device: DeviceRecord) {
    setEditing(device);
    setImported(null);
    setForm({
      esphomeFile: "",
      name: device.name,
      roomId: device.roomId ?? "",
      mqttTopicPrefix: device.mqttTopicPrefix,
      esphomeName: device.esphomeName ?? "",
      ipAddress: device.ipAddress ?? "",
    });
    setDialogOpen(true);
  }

  async function applyEsphomeImport(fileName: string) {
    if (!fileName) {
      setImported(null);
      setForm((f) => ({ ...f, esphomeFile: "" }));
      return;
    }
    try {
      const suggestion = await api.esphomeSuggest(fileName);
      setImported(suggestion);
      setForm((f) => ({
        ...f,
        esphomeFile: fileName,
        name: friendlyDeviceName(suggestion.esphomeName),
        mqttTopicPrefix: suggestion.mqttTopicPrefix,
        esphomeName: suggestion.esphomeName,
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read ESPHome YAML");
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.mqttTopicPrefix.trim()) {
      setError("Name and MQTT topic prefix are required");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.updateDevice(editing.id, {
          name: form.name.trim(),
          roomId: form.roomId || null,
          mqttTopicPrefix: form.mqttTopicPrefix.trim(),
          esphomeName: form.esphomeName.trim() || null,
          ipAddress: form.ipAddress.trim() || null,
        });
      } else {
        await api.createDevice({
          name: form.name.trim(),
          roomId: form.roomId || null,
          mqttTopicPrefix: form.mqttTopicPrefix.trim(),
          esphomeName: form.esphomeName.trim() || null,
          ipAddress: form.ipAddress.trim() || null,
          sensors: imported?.sensors,
          relays: imported?.relays,
        });
      }
      setDialogOpen(false);
      setEditing(null);
      setImported(null);
      setForm(emptyForm);
      setInfo(editing ? "Device updated" : "Device registered");
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
      await api.deleteDevice(deleteTarget.id);
      setDeleteTarget(null);
      setInfo(`Deleted ${deleteTarget.name}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(device: DeviceRecord) {
    try {
      await api.updateDevice(device.id, { isEnabled: !device.isEnabled });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function syncCapabilities() {
    setBusy(true);
    setInfo(null);
    try {
      const res = await api.syncCapabilities();
      setInfo(
        `Synced capabilities from sensors/relays (${res.sensors} sensors, ${res.relays} relays)`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function syncEsphome(device: DeviceRecord) {
    setBusy(true);
    try {
      const res = await api.syncDeviceEsphome(device.id);
      setInfo(
        `Synced ${device.name} from ${res.yamlFile}.yaml — added ${res.addedRelays} relay(s), ${res.totalRelays} total`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ESPHome sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function renameEntity(
    kind: "sensor" | "relay",
    deviceId: string,
    entityId: string,
    current: string
  ) {
    const next = window.prompt(`Rename ${kind}`, current);
    if (next === null || next.trim() === "" || next.trim() === current) return;
    try {
      if (kind === "relay") await api.renameRelay(deviceId, entityId, next.trim());
      else await api.renameSensor(deviceId, entityId, next.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    }
  }

  const esphomeUrl = esphomeDashboardUrl(hostname);

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={1}
      >
        <Typography variant="h4">Devices</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            href={esphomeUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewRoundedIcon />}
          >
            Open ESPHome
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                disabled={busy}
                startIcon={<SyncRoundedIcon />}
                onClick={() => void syncCapabilities()}
              >
                Sync capabilities
              </Button>
              <Button variant="contained" onClick={() => openCreate()}>
                Add device
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      <Typography color="text.secondary">
        Register ESP32 / ESPHome devices for dashboards, MQTT, and automations. Flash firmware in
        ESPHome Builder, then register the same YAML here.
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
      {catalogHint && <Alert severity="warning">{catalogHint}</Alert>}

      {isAdmin && unregistered.length > 0 && (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Found in ESPHome, not registered yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            YAML configs on the server that are not in the database yet.
          </Typography>
          <Stack spacing={1}>
            {unregistered.map((entry) => (
              <Stack
                key={entry.fileName}
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                gap={1}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={500}>
                    {entry.suggestion?.esphomeName || entry.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                    {entry.mqttTopicPrefix}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {entry.sensorCount} sensor(s), {entry.relayCount} relay(s)
                  </Typography>
                </Box>
                <Button size="small" variant="contained" onClick={() => openCreate(entry.fileName)}>
                  Register
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {devices.length === 0 ? (
        <Typography color="text.secondary">No devices registered yet.</Typography>
      ) : (
        devices.map((d) => (
          <Accordion key={d.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ width: "100%", pr: 1 }}
              >
                <Typography fontWeight={600}>{d.name}</Typography>
                <Chip
                  size="small"
                  label={d.isOnline ? "Online" : "Offline"}
                  color={d.isOnline ? "success" : "default"}
                />
                {!d.isEnabled && <Chip size="small" label="Disabled" color="warning" />}
                <Chip size="small" variant="outlined" label={d.roomName ?? `No ${AREA.singular}`} />
                <Typography variant="caption" color="text.secondary">
                  {d.sensors.length} sensor(s) · {d.relays.length} relay(s) · last seen{" "}
                  {formatLastSeen(d.lastSeenAt)}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                  {d.mqttTopicPrefix}
                  {d.ipAddress ? ` · ${d.ipAddress}` : ""}
                </Typography>

                {isAdmin && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={d.isEnabled}
                          onChange={() => void toggleEnabled(d)}
                          size="small"
                        />
                      }
                      label="Enabled"
                    />
                    <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(d)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<SyncRoundedIcon />}
                      disabled={busy}
                      onClick={() => void syncEsphome(d)}
                    >
                      Sync from YAML
                    </Button>
                    <Button
                      size="small"
                      href={esphomeDashboardUrl(hostname, d.esphomeName || d.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNewRoundedIcon />}
                    >
                      ESPHome
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Delete device"
                      onClick={() => setDeleteTarget(d)}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>MQTT</TableCell>
                      {isAdmin && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {d.sensors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>sensor · {s.sensorType}</TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {s.mqttStateTopic}
                          </Typography>
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => void renameEntity("sensor", d.id, s.id, s.name)}
                            >
                              Rename
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {d.relays.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.name}
                          {r.lastState ? ` (${r.lastState})` : ""}
                        </TableCell>
                        <TableCell>relay</TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {r.mqttStateTopic}
                          </Typography>
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => void renameEntity("relay", d.id, r.id, r.name)}
                            >
                              Rename
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {d.sensors.length === 0 && d.relays.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3}>
                          <Typography variant="body2" color="text.secondary">
                            No sensors or relays — import from ESPHome YAML or sync.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !busy && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={(e) => void onSave(e)}>
          <DialogTitle>{editing ? "Edit device" : "Register device"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!editing && (
                <FormControl fullWidth size="small">
                  <InputLabel id="esphome-file">Import from ESPHome YAML</InputLabel>
                  <Select
                    labelId="esphome-file"
                    label="Import from ESPHome YAML"
                    value={form.esphomeFile}
                    onChange={(e) => void applyEsphomeImport(e.target.value)}
                  >
                    <MenuItem value="">— Manual entry —</MenuItem>
                    {catalog.map((c) => (
                      <MenuItem key={c.fileName} value={c.fileName}>
                        {c.fileName}.yaml{c.registered ? " (registered)" : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {imported && (
                <Typography variant="caption" color="text.secondary">
                  Will create {imported.sensors.length} sensor(s) and {imported.relays.length}{" "}
                  relay(s) from YAML.
                </Typography>
              )}
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
              />
              <FormControl fullWidth size="small">
                <InputLabel id="device-area">{AREA.singular}</InputLabel>
                <Select
                  labelId="device-area"
                  label={AREA.singular}
                  value={form.roomId}
                  onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {areas.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="MQTT topic prefix"
                value={form.mqttTopicPrefix}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mqttTopicPrefix: e.target.value }))
                }
                required
                fullWidth
                helperText="Must match topic_prefix in the ESPHome YAML"
              />
              <TextField
                label="ESPHome name"
                value={form.esphomeName}
                onChange={(e) => setForm((f) => ({ ...f, esphomeName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="IP address"
                value={form.ipAddress}
                onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
                fullWidth
              />
              {!areas.length && (
                <Typography variant="caption" color="text.secondary">
                  No {AREA.plural.toLowerCase()} yet — create some under {AREA.plural} first
                  (optional).
                </Typography>
              )}
              <Link href={esphomeUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                Open ESPHome Builder
              </Link>
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
        <DialogTitle>Delete device</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong> and all its sensors/relays? This cannot be
            undone.
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
