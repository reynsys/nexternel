import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
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
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import {
  ESPHOME_BUILDER_CONFIG_VERSION,
  ESPHOME_BOARD_CATALOG,
  type BuilderComponent,
  type EsphomeBoardId,
  type EsphomeDeviceBuilderConfig,
  type EsphomePlatform,
} from "@nexternel/domain";
import {
  api,
  type EsphomeBuilderPreview,
  type EsphomeCatalogEntry,
} from "../../api";
import { AREA } from "../../lib/area-labels";
import {
  esphomeDashboardUrl,
  ESPHOME_WIZARD_INSTALL_STEPS,
  ESPHOME_WIZARD_INSTALL_TITLE,
} from "../../lib/device-utils";
import { InstallWorkflowStepper } from "./InstallWorkflowStepper";

type AreaOption = { id: string; name: string };

type Path = "choose" | "new" | "import" | "created";

type NewStep = "hardware" | "identity" | "components" | "review";

type CreatedDevice = { deviceId: string; name: string };

type Props = {
  open: boolean;
  busy: boolean;
  hostname: string;
  areas: AreaOption[];
  catalog: EsphomeCatalogEntry[];
  /** Pre-select import for a catalog file stem (no .yaml). */
  initialImportFile?: string | null;
  /** Re-open wizard for an existing managed device. */
  editDeviceId?: string | null;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string) => void;
  onCreated: () => void | Promise<void>;
  /** Open the Devices ESPHome panel for compile / install (Phase 10). */
  onOpenEsphomePanel?: (deviceId: string) => void;
};

function newComponentId(): string {
  return `c${Math.random().toString(36).slice(2, 9)}`;
}

function defaultDht(): BuilderComponent {
  return {
    id: newComponentId(),
    kind: "dht",
    variant: "DHT22",
    pin: 4,
    updateIntervalSeconds: 60,
  };
}

function defaultRelay(): BuilderComponent {
  return {
    id: newComponentId(),
    kind: "gpio_switch",
    pin: 16,
    name: "Relay",
    inverted: true,
  };
}

function defaultPms(): BuilderComponent {
  return {
    id: newComponentId(),
    kind: "pms",
    variant: "PMSX003",
    uartTxPin: 12,
    uartRxPin: 13,
    updateIntervalSeconds: 60,
  };
}

function defaultPulseMeter(): BuilderComponent {
  return {
    id: newComponentId(),
    kind: "pulse_meter",
    pin: 12,
    pulseRate: 1000,
  };
}

function componentLabel(comp: BuilderComponent): string {
  if (comp.kind === "dht") return "DHT sensor";
  if (comp.kind === "pms") return "PMS air quality";
  if (comp.kind === "pulse_meter") return "Energy pulse meter";
  return "Relay / switch";
}

function boardsForPlatform(platform: EsphomePlatform) {
  return ESPHOME_BOARD_CATALOG.filter((b) => b.platform === platform);
}

export function EsphomeAddDeviceWizard({
  open,
  busy,
  hostname,
  areas,
  catalog,
  initialImportFile,
  editDeviceId,
  onClose,
  onBusy,
  onError,
  onSuccess,
  onCreated,
  onOpenEsphomePanel,
}: Props) {
  const [path, setPath] = useState<Path>("choose");
  const [newStep, setNewStep] = useState<NewStep>("hardware");
  const [platform, setPlatform] = useState<EsphomePlatform>("esp32");
  const [boardId, setBoardId] = useState<EsphomeBoardId>("esp32dev");
  const [displayName, setDisplayName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [components, setComponents] = useState<BuilderComponent[]>([defaultDht()]);
  const [validationIssues, setValidationIssues] = useState<
    { path: string; message: string }[]
  >([]);
  const [preview, setPreview] = useState<EsphomeBuilderPreview | null>(null);
  const [importFile, setImportFile] = useState("");
  const [importPreview, setImportPreview] = useState<EsphomeBuilderPreview | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<CreatedDevice | null>(null);

  const isEditMode = Boolean(editDeviceId);

  const esphomeUrl = esphomeDashboardUrl(hostname);
  const importable = useMemo(
    () => catalog.filter((c) => !c.registered),
    [catalog]
  );

  const builderConfig = useMemo((): EsphomeDeviceBuilderConfig => {
    return {
      version: ESPHOME_BUILDER_CONFIG_VERSION,
      platform,
      boardId,
      displayName: displayName.trim(),
      roomId: roomId || null,
      components,
    };
  }, [platform, boardId, displayName, roomId, components]);

  const newSteps: NewStep[] = ["hardware", "identity", "components", "review"];
  const newStepIndex = newSteps.indexOf(newStep);

  function reset() {
    setPath("choose");
    setNewStep("hardware");
    setPlatform("esp32");
    setBoardId("esp32dev");
    setDisplayName("");
    setRoomId("");
    setComponents([defaultDht()]);
    setValidationIssues([]);
    setPreview(null);
    setImportFile("");
    setImportPreview(null);
    setCreatedDevice(null);
  }

  function finishWizard() {
    reset();
    onClose();
  }

  function openEsphomePanelForCreated() {
    if (!createdDevice) return;
    onOpenEsphomePanel?.(createdDevice.deviceId);
    finishWizard();
  }

  useEffect(() => {
    if (!open) return;
    if (editDeviceId) {
      setEditLoading(true);
      onError(null);
      void api
        .esphomeBuilderGetConfig(editDeviceId)
        .then((res) => {
          const cfg = res.config as EsphomeDeviceBuilderConfig;
          setPath("new");
          setNewStep("hardware");
          setPlatform(cfg.platform);
          setBoardId(cfg.boardId);
          setDisplayName(cfg.displayName);
          setRoomId(cfg.roomId ?? "");
          setComponents(cfg.components.length ? cfg.components : [defaultDht()]);
          setValidationIssues([]);
          setPreview(null);
        })
        .catch((err) => {
          onError(err instanceof Error ? err.message : "Failed to load configuration");
        })
        .finally(() => setEditLoading(false));
      return;
    }
    if (initialImportFile) {
      setPath("import");
      setImportFile(initialImportFile);
    } else {
      reset();
    }
  }, [open, initialImportFile, editDeviceId, onError]);

  useEffect(() => {
    const boards = boardsForPlatform(platform);
    if (!boards.some((b) => b.id === boardId)) {
      setBoardId(boards[0]?.id ?? "esp32dev");
    }
  }, [platform, boardId]);

  useEffect(() => {
    if (!open || path !== "import" || !importFile) {
      setImportPreview(null);
      return;
    }
    let cancelled = false;
    void api
      .v4EsphomePreview(importFile, roomId || null)
      .then((res) => {
        if (!cancelled) setImportPreview(res);
      })
      .catch(() => {
        if (!cancelled) setImportPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, path, importFile, roomId]);

  useEffect(() => {
    if (!open || path !== "new" || newStep !== "review") {
      setPreview(null);
      return;
    }
    let cancelled = false;
    onError(null);
    void api
      .esphomeBuilderPreview(builderConfig, roomId || null)
      .then((res) => {
        if (cancelled) return;
        setPreview(res);
        setValidationIssues(res.validation.issues);
      })
      .catch((err) => {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : "Preview failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, path, newStep, builderConfig, roomId, onError]);

  async function validateCurrentNewStep(): Promise<boolean> {
    if (newStep === "hardware") {
      onError(null);
      return true;
    }
    if (newStep === "identity") {
      if (!displayName.trim()) {
        onError("Device name is required");
        return false;
      }
      if (/^\d/.test(displayName.trim())) {
        onError("Device name must not start with a number");
        return false;
      }
      onError(null);
      return true;
    }
    const res = await api.esphomeBuilderValidate(builderConfig);
    setValidationIssues(res.issues);
    if (!res.valid) {
      onError(res.issues[0]?.message ?? "Fix the configuration before continuing");
      return false;
    }
    onError(null);
    return true;
  }

  async function onNextNew() {
    onBusy(true);
    try {
      const ok = await validateCurrentNewStep();
      if (!ok) return;
      const idx = newStepIndex;
      if (idx < newSteps.length - 1) {
        setNewStep(newSteps[idx + 1]);
      }
    } finally {
      onBusy(false);
    }
  }

  function onBackNew() {
    const idx = newStepIndex;
    if (idx > 0) setNewStep(newSteps[idx - 1]);
    else setPath("choose");
  }

  async function onCreateNew(e: FormEvent) {
    e.preventDefault();
    onBusy(true);
    onError(null);
    try {
      if (isEditMode && editDeviceId) {
        await api.esphomeBuilderUpdate(editDeviceId, builderConfig, roomId || null);
        onSuccess(
          `Saved ${displayName.trim()}. Open ESPHome → Compile firmware, then Install OTA if hardware changed.`
        );
        await Promise.resolve(onCreated());
        finishWizard();
      } else {
        const result = await api.esphomeBuilderCreate(builderConfig, roomId || null);
        await Promise.resolve(onCreated());
        setCreatedDevice({ deviceId: result.deviceId, name: displayName.trim() });
        setPath("created");
        onSuccess(`Created ${displayName.trim()}. Continue with firmware install below.`);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : isEditMode ? "Save failed" : "Create failed");
    } finally {
      onBusy(false);
    }
  }

  async function onImportCreate(e: FormEvent) {
    e.preventDefault();
    if (!importFile) {
      onError("Select a device configuration");
      return;
    }
    onBusy(true);
    onError(null);
    try {
      const entry = catalog.find((c) => c.fileName === importFile);
      await api.v4OnboardEsphome({
        yamlName: importFile,
        name: entry?.suggestion?.esphomeName
          ? undefined
          : importFile.replace(/-/g, " "),
        roomId: roomId || null,
      });
      onSuccess(
        `Registered ${importFile}. Capabilities are ready — no separate sync needed.`
      );
      onCreated();
      onClose();
      reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Import failed");
    } finally {
      onBusy(false);
    }
  }

  const dialogTitle =
    path === "created"
      ? "Device created"
      : isEditMode
        ? "Edit ESPHome configuration"
        : path === "choose"
          ? "Add device"
          : path === "import"
            ? "Import ESPHome device"
            : "New ESPHome device";

  const installActiveStep = ESPHOME_WIZARD_INSTALL_STEPS.findIndex(
    (s) => s.state === "awaiting_installation"
  );

  return (
    <Dialog
      open={open}
      onClose={() => !busy && finishWizard()}
      fullWidth
      maxWidth="md"
    >
      <form
        onSubmit={(e) => {
          if (path === "new" && newStep === "review") void onCreateNew(e);
          else if (path === "import") void onImportCreate(e);
          else e.preventDefault();
        }}
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          {editLoading && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Loading configuration…
            </Typography>
          )}
          {!editLoading && path === "choose" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography color="text.secondary">
                Add a new ESP32 or ESP8266 by describing the hardware attached to it.
                Nexternel generates the configuration and registers capabilities automatically.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  setPath("new");
                  setNewStep("hardware");
                }}
              >
                New ESPHome device
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => setPath("import")}
              >
                Import existing configuration
              </Button>
              <Typography variant="caption" color="text.secondary">
                Import is for YAML already on this server (migration or advanced setups).
              </Typography>
            </Stack>
          )}

          {!editLoading && path === "new" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stepper activeStep={newStepIndex} alternativeLabel>
                <Step>
                  <StepLabel>Hardware</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Device</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Components</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Review</StepLabel>
                </Step>
              </Stepper>

              {newStep === "hardware" && (
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="esp-platform">Platform</InputLabel>
                    <Select
                      labelId="esp-platform"
                      label="Platform"
                      value={platform}
                      onChange={(e) =>
                        setPlatform(e.target.value as EsphomePlatform)
                      }
                    >
                      <MenuItem value="esp32">ESP32</MenuItem>
                      <MenuItem value="esp8266">ESP8266</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel id="esp-board">Board</InputLabel>
                    <Select
                      labelId="esp-board"
                      label="Board"
                      value={boardId}
                      onChange={(e) =>
                        setBoardId(e.target.value as EsphomeBoardId)
                      }
                    >
                      {boardsForPlatform(platform).map((b) => (
                        <MenuItem key={b.id} value={b.id}>
                          {b.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}

              {newStep === "identity" && (
                <Stack spacing={2}>
                  <TextField
                    label="Device name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    fullWidth
                    autoFocus
                    helperText="Shown in Nexternel (e.g. Garden Controller). Must not start with a number."
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel id="esp-area">{AREA.singular}</InputLabel>
                    <Select
                      labelId="esp-area"
                      label={AREA.singular}
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                    >
                      <MenuItem value="">— None —</MenuItem>
                      {areas.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}

              {newStep === "components" && (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Add sensors and relays connected to this board. Wi-Fi and MQTT are
                    configured automatically from this server.
                  </Typography>
                  {components.map((comp, index) => (
                    <Box
                      key={comp.id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1.5,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Typography fontWeight={600}>{componentLabel(comp)}</Typography>
                        <IconButton
                          size="small"
                          aria-label="Remove component"
                          onClick={() =>
                            setComponents((list) =>
                              list.filter((_, i) => i !== index)
                            )
                          }
                          disabled={components.length <= 1}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      {comp.kind === "dht" ? (
                        <Stack spacing={1.5}>
                          <FormControl fullWidth size="small">
                            <InputLabel id={`dht-var-${comp.id}`}>Type</InputLabel>
                            <Select
                              labelId={`dht-var-${comp.id}`}
                              label="Type"
                              value={comp.variant}
                              onChange={(e) =>
                                setComponents((list) =>
                                  list.map((c, i) =>
                                    i === index && c.kind === "dht"
                                      ? {
                                          ...c,
                                          variant: e.target
                                            .value as typeof comp.variant,
                                        }
                                      : c
                                  )
                                )
                              }
                            >
                              <MenuItem value="DHT22">DHT22</MenuItem>
                              <MenuItem value="DHT11">DHT11</MenuItem>
                              <MenuItem value="DHT21">DHT21</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            label="Data pin (GPIO)"
                            type="number"
                            size="small"
                            value={comp.pin}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "dht"
                                    ? { ...c, pin: Number(e.target.value) }
                                    : c
                                )
                              )
                            }
                            fullWidth
                          />
                        </Stack>
                      ) : comp.kind === "pms" ? (
                        <Stack spacing={1.5}>
                          <FormControl fullWidth size="small">
                            <InputLabel id={`pms-var-${comp.id}`}>Model</InputLabel>
                            <Select
                              labelId={`pms-var-${comp.id}`}
                              label="Model"
                              value={comp.variant}
                              onChange={(e) =>
                                setComponents((list) =>
                                  list.map((c, i) =>
                                    i === index && c.kind === "pms"
                                      ? {
                                          ...c,
                                          variant: e.target.value as typeof comp.variant,
                                        }
                                      : c
                                  )
                                )
                              }
                            >
                              <MenuItem value="PMSX003">PMSX003 series</MenuItem>
                              <MenuItem value="PMS5003">PMS5003</MenuItem>
                              <MenuItem value="PMS7003">PMS7003</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            label="UART TX pin (GPIO)"
                            type="number"
                            size="small"
                            value={comp.uartTxPin}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "pms"
                                    ? { ...c, uartTxPin: Number(e.target.value) }
                                    : c
                                )
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="UART RX pin (GPIO)"
                            type="number"
                            size="small"
                            value={comp.uartRxPin}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "pms"
                                    ? { ...c, uartRxPin: Number(e.target.value) }
                                    : c
                                )
                              )
                            }
                            fullWidth
                          />
                        </Stack>
                      ) : comp.kind === "pulse_meter" ? (
                        <Stack spacing={1.5}>
                          <TextField
                            label="Pulse input pin (GPIO)"
                            type="number"
                            size="small"
                            value={comp.pin}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "pulse_meter"
                                    ? { ...c, pin: Number(e.target.value) }
                                    : c
                                )
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="Impulses per kWh"
                            type="number"
                            size="small"
                            value={comp.pulseRate}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "pulse_meter"
                                    ? { ...c, pulseRate: Number(e.target.value) }
                                    : c
                                )
                              )
                            }
                            fullWidth
                            helperText="Printed on your meter (often 1000)"
                          />
                        </Stack>
                      ) : comp.kind === "gpio_switch" ? (
                        <Stack spacing={1.5}>
                          <TextField
                            label="Name"
                            size="small"
                            value={comp.name}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "gpio_switch"
                                    ? { ...c, name: e.target.value }
                                    : c
                                )
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            label="GPIO pin"
                            type="number"
                            size="small"
                            value={comp.pin}
                            onChange={(e) =>
                              setComponents((list) =>
                                list.map((c, i) =>
                                  i === index && c.kind === "gpio_switch"
                                    ? { ...c, pin: Number(e.target.value) }
                                    : c
                                )
                              )
                            }
                            fullWidth
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={comp.inverted !== false}
                                onChange={(e) =>
                                  setComponents((list) =>
                                    list.map((c, i) =>
                                      i === index && c.kind === "gpio_switch"
                                        ? { ...c, inverted: e.target.checked }
                                        : c
                                    )
                                  )
                                }
                              />
                            }
                            label="Active low (typical relay module)"
                          />
                        </Stack>
                      ) : null}
                    </Box>
                  ))}
                  <Stack direction="row" spacing={1}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setComponents((list) => [...list, defaultDht()])}
                    >
                      Add DHT
                    </Button>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() =>
                        setComponents((list) => [...list, defaultRelay()])
                      }
                    >
                      Add relay
                    </Button>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setComponents((list) => [...list, defaultPms()])}
                    >
                      Add PMS
                    </Button>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() =>
                        setComponents((list) => [...list, defaultPulseMeter()])
                      }
                    >
                      Add pulse meter
                    </Button>
                  </Stack>
                </Stack>
              )}

              {newStep === "review" && (
                <Stack spacing={2}>
                  {!preview && (
                    <Typography color="text.secondary">Loading preview…</Typography>
                  )}
                  {validationIssues.length > 0 && (
                    <Alert severity="error">
                      {validationIssues.map((i) => (
                        <div key={`${i.path}-${i.message}`}>{i.message}</div>
                      ))}
                    </Alert>
                  )}
                  {preview?.mapped?.length ? (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Capabilities to create
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                        {preview.mapped.map((m) => (
                          <li key={`${m.kind}-${m.name}`}>
                            {m.name} ({m.kind})
                            {m.systemId ? ` · ${m.systemId}` : ""}
                          </li>
                        ))}
                      </ul>
                    </Box>
                  ) : null}
                  {!isEditMode && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        {ESPHOME_WIZARD_INSTALL_TITLE}
                      </Typography>
                      <InstallWorkflowStepper activeStep={0} />
                    </Box>
                  )}
                  <Alert severity="info">
                    After creating, open <strong>ESPHome</strong> on the Devices page to compile
                    and install firmware.
                  </Alert>
                  <Button
                    href={esphomeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNewRoundedIcon />}
                  >
                    Open ESPHome
                  </Button>
                </Stack>
              )}
            </Stack>
          )}

          {!editLoading && path === "import" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="import-yaml">Server configuration</InputLabel>
                <Select
                  labelId="import-yaml"
                  label="Server configuration"
                  value={importFile}
                  onChange={(e) => setImportFile(e.target.value)}
                  required
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {importable.map((c) => (
                    <MenuItem key={c.fileName} value={c.fileName}>
                      {c.fileName}.yaml
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="import-area">{AREA.singular}</InputLabel>
                <Select
                  labelId="import-area"
                  label={AREA.singular}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {areas.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {importPreview?.mapped?.length ? (
                <Typography variant="body2" color="text.secondary">
                  Will register {importPreview.mapped.length} capability/capabilities
                  from the YAML.
                </Typography>
              ) : null}
              {importable.length === 0 && (
                <Alert severity="warning">
                  No unregistered YAML files found on the server.
                </Alert>
              )}
            </Stack>
          )}

          {!editLoading && path === "created" && createdDevice && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="success">
                <strong>{createdDevice.name}</strong> is registered. YAML is on this server —
                continue with firmware install.
              </Alert>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {ESPHOME_WIZARD_INSTALL_TITLE}
                </Typography>
                <InstallWorkflowStepper activeStep={installActiveStep} />
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  startIcon={<BuildRoundedIcon />}
                  onClick={openEsphomePanelForCreated}
                >
                  Open ESPHome
                </Button>
                <Button
                  href={esphomeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewRoundedIcon />}
                >
                  ESPHome dashboard
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {path === "created" ? (
            <Button variant="contained" onClick={finishWizard}>
              Done
            </Button>
          ) : (
            <>
          <Button onClick={() => finishWizard()} disabled={busy}>
            Cancel
          </Button>
          {path === "choose" ? null : path === "import" ? (
            <Button type="submit" variant="contained" disabled={busy || !importFile}>
              {busy ? "Registering…" : "Register device"}
            </Button>
          ) : newStep === "review" ? (
            <>
              <Button onClick={onBackNew} disabled={busy}>
                Back
              </Button>
              <Button type="submit" variant="contained" disabled={busy || !preview?.ok}>
                {busy
                  ? isEditMode
                    ? "Saving…"
                    : "Creating…"
                  : isEditMode
                    ? "Save configuration"
                    : "Create device"}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onBackNew} disabled={busy}>
                Back
              </Button>
              <Button variant="contained" onClick={() => void onNextNew()} disabled={busy}>
                Next
              </Button>
            </>
          )}
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
