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
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import {
  api,
  type DeviceRecord,
  type EsphomeCatalogEntry,
} from "../../api";
import { AREA } from "../../lib/area-labels";
import {
  esphomeDashboardUrl,
  esphomeLifecycleLabel,
  formatLastSeen,
} from "../../lib/device-utils";
import { useContentSurfaceSx } from "../../skins/useSurfaceStyles";
import { OctopusSettingsCard } from "./OctopusSettingsCard";
import { EsphomeAddDeviceWizard } from "./EsphomeAddDeviceWizard";
import { EsphomeDevicePanelDialog } from "./EsphomeDevicePanelDialog";

type AreaOption = { id: string; name: string };

const emptyForm = {
  name: "",
  roomId: "",
  mqttTopicPrefix: "",
  esphomeName: "",
  ipAddress: "",
};

const emptyShellyForm = {
  name: "",
  roomId: "",
  mqttTopicPrefix: "",
  shellyModelId: "switch_1",
  shellyGen: 2 as 1 | 2,
};

type ShellyModelOption = {
  id: string;
  label: string;
  switchCount: number;
  hint: string;
};

type DiscoveredShellyRow = {
  topicPrefix: string;
  model: string | null;
  app: string | null;
  mac: string | null;
  gen: number | null;
  version: string | null;
  ip: string | null;
  suggestedSwitchCount: number;
  suggestedModelId: string;
  suggestedGen: 1 | 2;
  switchCountProbed: boolean;
  alreadyRegistered: boolean;
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
  const contentSurface = useContentSurfaceSx();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardImportFile, setWizardImportFile] = useState<string | null>(null);
  const [wizardEditDeviceId, setWizardEditDeviceId] = useState<string | null>(null);
  const [shellyDialogOpen, setShellyDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [shellyForm, setShellyForm] = useState(emptyShellyForm);
  const [shellyModels, setShellyModels] = useState<ShellyModelOption[]>([]);
  const [discoveredShellies, setDiscoveredShellies] = useState<DiscoveredShellyRow[]>(
    []
  );
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeviceRecord | null>(null);
  const [esphomePanelDevice, setEsphomePanelDevice] = useState<DeviceRecord | null>(null);
  const [systems, setSystems] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  async function load() {
    try {
      const [devRes, roomRes, me, catRes] = await Promise.all([
        api.devices(),
        api.rooms(),
        api.me(),
        api.esphomeCatalog().catch(() => ({
          configs: [],
          esphomeDirHint: null,
          pruned: [],
        })),
      ]);
      setDevices(devRes.devices);
      setAreas(roomRes.rooms.map((r) => ({ id: r.id, name: r.name })));
      setIsAdmin(Boolean(me.user.permissions?.editDevices ?? me.user.isAdmin ?? me.user.role === "admin"));
      if (me.user.permissions?.editDevices ?? me.user.isAdmin ?? me.user.role === "admin") {
        const sysRes = await api.v4Systems({ catalog: true });
        setSystems(
          sysRes.systems
            .filter((s) => s.operatorVisible !== false && s.tier !== "deprecated")
            .map((s) => ({ id: s.id, label: s.label }))
        );
      } else {
        setSystems([]);
      }
      setCatalog(catRes.configs);
      setCatalogHint(catRes.esphomeDirHint);
      if (catRes.pruned?.length) {
        setInfo(
          `Removed ${catRes.pruned.length} device(s) whose YAML was deleted from the server: ${catRes.pruned.map((p) => p.name).join(", ")}`
        );
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const unregistered = useMemo(
    () => catalog.filter((c) => !c.registered),
    [catalog]
  );

  function openAddDeviceWizard(fileName?: string) {
    setWizardEditDeviceId(null);
    setWizardImportFile(fileName ?? null);
    setWizardOpen(true);
  }

  function openEditBuilder(d: DeviceRecord) {
    setWizardEditDeviceId(d.id);
    setWizardImportFile(null);
    setWizardOpen(true);
  }

  async function adoptToBuilder(d: DeviceRecord) {
    setBusy(true);
    setError(null);
    try {
      await api.esphomeAdoptManaged(d.id);
      setInfo(
        `Adopted ${d.name} into the Device Builder. You can now use Edit configuration.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adopt to builder failed");
    } finally {
      setBusy(false);
    }
  }

  function openShellyCreate() {
    setShellyForm(emptyShellyForm);
    setDiscoveredShellies([]);
    setShellyDialogOpen(true);
    void api
      .shellyModels()
      .then((res) => setShellyModels(res.models))
      .catch(() => setShellyModels([]));
  }

  async function onDiscoverShellies() {
    setDiscoverBusy(true);
    setError(null);
    try {
      const res = await api.shellyDiscover({ timeoutMs: 5000 });
      setDiscoveredShellies(res.devices);
      if (res.devices.length === 0) {
        setInfo(
          "No Shelly devices answered. Check MQTT is enabled on the Shelly and pointed at this server."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscoverBusy(false);
    }
  }

  function adoptDiscoveredShelly(d: DiscoveredShellyRow) {
    const label =
      d.app || d.model || d.topicPrefix.replace(/^shelly/i, "Shelly ");
    setShellyForm((f) => ({
      ...f,
      name: f.name.trim() || label,
      mqttTopicPrefix: d.topicPrefix,
      shellyModelId: d.suggestedModelId || "switch_1",
      shellyGen: d.suggestedGen ?? 2,
    }));
  }

  async function onSaveShelly(e: FormEvent) {
    e.preventDefault();
    if (!shellyForm.name.trim() || !shellyForm.mqttTopicPrefix.trim()) {
      setError("Name and device ID are required");
      return;
    }
    setBusy(true);
    try {
      const model = shellyModels.find((m) => m.id === shellyForm.shellyModelId);
      await api.createDevice({
        name: shellyForm.name.trim(),
        roomId: shellyForm.roomId || null,
        mqttTopicPrefix: shellyForm.mqttTopicPrefix.trim().replace(/\/+$/, ""),
        firmwareType: "shelly",
        shellyModelId: shellyForm.shellyModelId,
        shellySwitchCount: model?.switchCount ?? 1,
        shellyGen: shellyForm.shellyGen,
      });
      setShellyDialogOpen(false);
      setShellyForm(emptyShellyForm);
      setDiscoveredShellies([]);
      const channels = model?.switchCount ?? 1;
      setInfo(
        channels > 1
          ? `Shelly added with ${channels} switches. Dashboard → Edit → Add panel → Controls.`
          : "Shelly added. Dashboard → Edit → Add panel → Controls."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(device: DeviceRecord) {
    setEditing(device);
    setForm({
      name: device.name,
      roomId: device.roomId ?? "",
      mqttTopicPrefix: device.mqttTopicPrefix,
      esphomeName: device.esphomeName ?? "",
      ipAddress: device.ipAddress ?? "",
    });
    setDialogOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!form.name.trim() || !form.mqttTopicPrefix.trim()) {
      setError("Name and MQTT topic prefix are required");
      return;
    }
    setBusy(true);
    try {
      await api.updateDevice(editing.id, {
        name: form.name.trim(),
        roomId: form.roomId || null,
        mqttTopicPrefix: form.mqttTopicPrefix.trim(),
        esphomeName: form.esphomeName.trim() || null,
        ipAddress: form.ipAddress.trim() || null,
      });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setInfo("Device updated");
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
        pruneParts.length > 0 ? ` — removed ${pruneParts.join(", ")}` : "";
      setInfo(
        `Synced capabilities from sensors/relays (${res.sensors} sensors, ${res.relays} relays)${pruneNote}`
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
      const pruneParts: string[] = [];
      if (res.removedRelays > 0) pruneParts.push(`${res.removedRelays} relay(s)`);
      if (res.removedSensors > 0) pruneParts.push(`${res.removedSensors} sensor(s)`);
      const pruneNote =
        pruneParts.length > 0 ? ` — removed ${pruneParts.join(", ")} not in YAML` : "";
      setInfo(
        `Synced ${device.name} from ${res.yamlFile}.yaml — ${res.totalRelays} relay(s), ${res.sensorsInYaml.length} sensor(s) in YAML${pruneNote}`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ESPHome sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadFlashYaml(device: DeviceRecord) {
    const stem = (device.esphomeName || device.slug || "").trim();
    if (!stem) {
      setError("Device has no ESPHome name / slug — cannot build flash YAML");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { blob, filename } = await api.downloadFlashReadyYaml(stem);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setInfo(
        `Downloaded ${filename} — open it and you should see the broker IP under mqtt:. Flash via USB / web.esphome.io.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flash YAML download failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateCapabilitySystem(capabilityId: string, systemId: string | null) {
    try {
      await api.v4UpdateCapabilitySystem(capabilityId, systemId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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

  async function removeEntity(kind: "sensor" | "relay", deviceId: string, entityId: string, name: string) {
    const label = kind === "relay" ? "relay" : "sensor";
    if (
      !window.confirm(
        `Remove ${label} "${name}" from this device? Dashboard bindings to it will stop working until you sync again.`
      )
    ) {
      return;
    }
    try {
      if (kind === "relay") await api.deleteRelay(deviceId, entityId);
      else await api.deleteSensor(deviceId, entityId);
      setInfo(`Removed ${label} "${name}"`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
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
              <Button variant="outlined" onClick={() => openShellyCreate()}>
                Add Shelly
              </Button>
              <Button variant="contained" onClick={() => openAddDeviceWizard()}>
                Add device
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      <Typography color="text.secondary">
        Register ESPHome boards and Shelly switches for dashboards.
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
            ...contentSurface,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Found in ESPHome, not registered yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Device configs found on the server that are not registered yet.
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
                  ...contentSurface,
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
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => openAddDeviceWizard(entry.fileName)}
                >
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
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    (d.firmwareType || "esphome") === "shelly"
                      ? "Shelly"
                      : d.firmwareType === "octopus"
                        ? "Octopus"
                        : "ESPHome"
                  }
                />
                {!d.isEnabled && <Chip size="small" label="Disabled" color="warning" />}
                {esphomeLifecycleLabel(d.esphomeLifecycleState) && (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={
                      d.esphomeLifecycleState === "firmware_ready"
                        ? "success"
                        : d.esphomeLifecycleState === "error" ||
                            d.esphomeLifecycleState === "validation_failed"
                          ? "error"
                          : d.esphomeLifecycleState === "building"
                            ? "info"
                            : "default"
                    }
                    label={esphomeLifecycleLabel(d.esphomeLifecycleState)}
                  />
                )}
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
                    {(d.firmwareType || "esphome") === "esphome" && (
                      <>
                        {d.esphomeManagementMode === "managed" && (
                          <Button
                            size="small"
                            startIcon={<EditRoundedIcon />}
                            disabled={busy}
                            onClick={() => openEditBuilder(d)}
                          >
                            Edit configuration
                          </Button>
                        )}
                        {d.esphomeManagementMode !== "managed" && (
                          <Button
                            size="small"
                            disabled={busy}
                            onClick={() => void adoptToBuilder(d)}
                          >
                            Adopt to builder
                          </Button>
                        )}
                        <Button
                          size="small"
                          startIcon={<BuildRoundedIcon />}
                          disabled={busy}
                          onClick={() => setEsphomePanelDevice(d)}
                        >
                          ESPHome
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
                          startIcon={<DownloadRoundedIcon />}
                          disabled={busy}
                          onClick={() => void downloadFlashYaml(d)}
                        >
                          Flash YAML
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
                      </>
                    )}
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
                      {isAdmin && <TableCell>Function</TableCell>}
                      <TableCell>MQTT</TableCell>
                      {isAdmin && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {d.sensors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>sensor · {s.sensorType}</TableCell>
                        {isAdmin && (
                          <TableCell sx={{ minWidth: 140 }}>
                            {s.capabilityId ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={s.systemId ?? ""}
                                  displayEmpty
                                  onChange={(e) =>
                                    void updateCapabilitySystem(
                                      s.capabilityId!,
                                      e.target.value ? String(e.target.value) : null
                                    )
                                  }
                                >
                                  <MenuItem value="">—</MenuItem>
                                  {systems.map((sys) => (
                                    <MenuItem key={sys.id} value={sys.id}>
                                      {sys.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Sync capabilities
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {s.mqttStateTopic}
                          </Typography>
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Button
                                size="small"
                                onClick={() => void renameEntity("sensor", d.id, s.id, s.name)}
                              >
                                Rename
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => void removeEntity("sensor", d.id, s.id, s.name)}
                              >
                                Remove
                              </Button>
                            </Stack>
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
                        {isAdmin && (
                          <TableCell sx={{ minWidth: 140 }}>
                            {r.capabilityId ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={r.systemId ?? ""}
                                  displayEmpty
                                  onChange={(e) =>
                                    void updateCapabilitySystem(
                                      r.capabilityId!,
                                      e.target.value ? String(e.target.value) : null
                                    )
                                  }
                                >
                                  <MenuItem value="">—</MenuItem>
                                  {systems.map((sys) => (
                                    <MenuItem key={sys.id} value={sys.id}>
                                      {sys.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Sync capabilities
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {r.mqttStateTopic}
                          </Typography>
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Button
                                size="small"
                                onClick={() => void renameEntity("relay", d.id, r.id, r.name)}
                              >
                                Rename
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => void removeEntity("relay", d.id, r.id, r.name)}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {d.sensors.length === 0 && d.relays.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 5 : 3}>
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

      {isAdmin && <OctopusSettingsCard />}

      {isAdmin && (
        <EsphomeAddDeviceWizard
          open={wizardOpen}
          busy={busy}
          hostname={hostname}
          areas={areas}
          catalog={catalog}
          initialImportFile={wizardImportFile}
          editDeviceId={wizardEditDeviceId}
          onClose={() => {
            setWizardOpen(false);
            setWizardImportFile(null);
            setWizardEditDeviceId(null);
          }}
          onBusy={setBusy}
          onError={setError}
          onSuccess={setInfo}
          onCreated={() => void load()}
        />
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !busy && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={(e) => void onSave(e)}>
          <DialogTitle>Edit device</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
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
                helperText={
                  editing?.firmwareType === "shelly"
                    ? "Shelly MQTT topic prefix from the device"
                    : "Must match the device topic prefix in ESPHome"
                }
              />
              {editing?.firmwareType !== "shelly" && (
                <TextField
                  label="ESPHome name"
                  value={form.esphomeName}
                  onChange={(e) => setForm((f) => ({ ...f, esphomeName: e.target.value }))}
                  fullWidth
                />
              )}
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
              {editing?.firmwareType !== "shelly" && (
                <Link href={esphomeUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                  Open ESPHome Builder
                </Link>
              )}
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
        open={shellyDialogOpen}
        onClose={() => !busy && setShellyDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={(e) => void onSaveShelly(e)}>
          <DialogTitle>Add Shelly</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                Shellies must use this server’s MQTT (same user/password as Nexternel).
                Use <strong>Find on MQTT</strong> to list devices that announce themselves, or
                paste the device ID manually. For older Gen&nbsp;1 devices (e.g. SHSW-1), choose
                <strong>Gen 1</strong> below.
              </Alert>

              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  disabled={busy || discoverBusy}
                  onClick={() => void onDiscoverShellies()}
                >
                  {discoverBusy ? "Scanning…" : "Find on MQTT"}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Takes a few seconds
                </Typography>
              </Stack>

              {discoveredShellies.length > 0 && (
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Device</TableCell>
                        <TableCell>Gen</TableCell>
                        <TableCell>Channels</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {discoveredShellies.map((d) => (
                        <TableRow key={d.topicPrefix} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {d.app || d.model || d.topicPrefix}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {d.topicPrefix}
                              {d.alreadyRegistered ? " · already added" : ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {d.suggestedGen === 1 ? "1" : "2+"}
                          </TableCell>
                          <TableCell>
                            {d.suggestedSwitchCount}
                            {d.switchCountProbed ? "" : " (guess)"}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              disabled={d.alreadyRegistered || busy}
                              onClick={() => adoptDiscoveredShelly(d)}
                            >
                              Use
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              <TextField
                label="Display name"
                value={shellyForm.name}
                onChange={(e) => setShellyForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
                placeholder="Living room light"
              />
              <FormControl fullWidth size="small">
                <InputLabel id="shelly-area">{AREA.singular}</InputLabel>
                <Select
                  labelId="shelly-area"
                  label={AREA.singular}
                  value={shellyForm.roomId}
                  onChange={(e) =>
                    setShellyForm((f) => ({ ...f, roomId: e.target.value }))
                  }
                >
                  <MenuItem value="">— None —</MenuItem>
                  {areas.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="shelly-gen">Shelly generation</InputLabel>
                <Select
                  labelId="shelly-gen"
                  label="Shelly generation"
                  value={shellyForm.shellyGen}
                  onChange={(e) =>
                    setShellyForm((f) => ({
                      ...f,
                      shellyGen: Number(e.target.value) as 1 | 2,
                    }))
                  }
                >
                  <MenuItem value={2}>Gen 2+ (Plus, Mini Gen3, Pro, …)</MenuItem>
                  <MenuItem value={1}>Gen 1 (SHSW-1, Shelly 2.5, …)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Shelly device ID"
                value={shellyForm.mqttTopicPrefix}
                onChange={(e) =>
                  setShellyForm((f) => ({ ...f, mqttTopicPrefix: e.target.value }))
                }
                required
                fullWidth
                placeholder={
                  shellyForm.shellyGen === 1
                    ? "shelly1-B929CC"
                    : "shelly1minig3-xxxxxxxxxxxx"
                }
                helperText={
                  shellyForm.shellyGen === 1
                    ? "Device ID from the Shelly web UI (shellies/… prefix is added automatically)"
                    : "MQTT topic prefix from the Shelly — or pick one from Find on MQTT"
                }
              />
              <FormControl fullWidth size="small">
                <InputLabel id="shelly-model">Switches on this device</InputLabel>
                <Select
                  labelId="shelly-model"
                  label="Switches on this device"
                  value={shellyForm.shellyModelId}
                  onChange={(e) =>
                    setShellyForm((f) => ({ ...f, shellyModelId: e.target.value }))
                  }
                >
                  {(shellyModels.length
                    ? shellyModels
                    : [
                        {
                          id: "switch_1",
                          label: "1 switch",
                          switchCount: 1,
                          hint: "",
                        },
                        {
                          id: "switch_2",
                          label: "2 switches",
                          switchCount: 2,
                          hint: "",
                        },
                        {
                          id: "switch_3",
                          label: "3 switches",
                          switchCount: 3,
                          hint: "",
                        },
                        {
                          id: "switch_4",
                          label: "4 switches",
                          switchCount: 4,
                          hint: "",
                        },
                      ]
                  ).map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label}
                      {m.hint ? ` — ${m.hint}` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShellyDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy || discoverBusy}>
              {busy ? "Saving…" : "Add Shelly"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {isAdmin && (
        <EsphomeDevicePanelDialog
          open={Boolean(esphomePanelDevice)}
          device={esphomePanelDevice}
          busy={busy}
          onClose={() => setEsphomePanelDevice(null)}
          onBusy={setBusy}
          onError={setError}
          onSuccess={setInfo}
          onUpdated={() => void load()}
        />
      )}

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
