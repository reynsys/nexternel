import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { api, type CameraRecord, type WidgetInstance } from "../api";
import {
  generalWidgetHeading,
  isGeneralWidgetType,
  parseCameraConfig,
  parseDeviceStatusConfig,
  parseWeatherConfig,
  widgetTitleOr,
  type GeneralWidgetType,
} from "./general/config";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

const TYPE_LABELS: Record<GeneralWidgetType, string> = {
  calendar: "Calendar",
  weather: "Weather",
  system_info: "System",
  device_status: "Devices",
  camera: "Camera",
};

export function GeneralWidgetEditor({ open, widget, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [weatherLocation, setWeatherLocation] = useState("London");
  const [weatherLat, setWeatherLat] = useState("51.5074");
  const [weatherLon, setWeatherLon] = useState("-0.1278");
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [cameraId, setCameraId] = useState("");
  const [cameras, setCameras] = useState<CameraRecord[]>([]);

  useEffect(() => {
    if (!open || !widget || !isGeneralWidgetType(widget.type)) return;
    const type = widget.type as GeneralWidgetType;
    const label = TYPE_LABELS[type];
    setGeocodeError(null);
    setGeocodeHint(null);
    if (type === "weather") {
      const w = parseWeatherConfig(widget.config);
      const loc = w.weatherLocation === "Weather" ? "London" : w.weatherLocation;
      setWeatherLocation(loc);
      setWeatherLat(String(w.weatherLat));
      setWeatherLon(String(w.weatherLon));
      setTitle(widgetTitleOr(widget, "Weather") ?? "");
    } else {
      const custom = widgetTitleOr(widget, label);
      setTitle(custom ?? "");
    }
    setOfflineOnly(parseDeviceStatusConfig(widget.config).offlineOnly);
    setCameraId(parseCameraConfig(widget.config).cameraId);
  }, [open, widget?.id]);

  useEffect(() => {
    if (!open || widget?.type !== "camera") return;
    void api
      .cameras()
      .then((r) => setCameras(r.cameras.filter((c) => c.enabled)))
      .catch(() => setCameras([]));
  }, [open, widget?.type]);

  if (!widget || !isGeneralWidgetType(widget.type)) return null;

  const type = widget.type;
  const label = TYPE_LABELS[type];

  async function lookupPlace() {
    const q = weatherLocation.trim();
    if (q.length < 2) {
      setGeocodeError("Enter a place name first (e.g. town or postcode area)");
      return;
    }
    setGeocodeBusy(true);
    setGeocodeError(null);
    setGeocodeHint(null);
    try {
      const { results } = await api.weatherGeocode(q);
      const best = results[0];
      if (!best) {
        setGeocodeError(
          "No matches — try a clearer place name or enter lat/lon manually"
        );
        return;
      }
      setWeatherLat(String(best.latitude));
      setWeatherLon(String(best.longitude));
      setWeatherLocation(best.name);
      setGeocodeHint(
        `Using ${best.label} → ${best.latitude.toFixed(4)}, ${best.longitude.toFixed(4)}`
      );
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setGeocodeBusy(false);
    }
  }

  function handleApply() {
    const config: Record<string, unknown> = { ...(widget.config ?? {}) };
    if (type === "weather") {
      const lat = Number(weatherLat);
      const lon = Number(weatherLon);
      config.weatherLocation = weatherLocation.trim() || "London";
      config.weatherLat = Number.isFinite(lat) ? lat : 51.5074;
      config.weatherLon = Number.isFinite(lon) ? lon : -0.1278;
    }
    if (type === "device_status") {
      config.offlineOnly = offlineOnly;
    }
    if (type === "camera") {
      config.cameraId = cameraId;
    }
    const trimmed = title.trim();
    const isPlaceholder =
      !trimmed ||
      trimmed === label ||
      trimmed === type ||
      trimmed === "System information" ||
      trimmed === "Device status" ||
      trimmed === "Calendar" ||
      trimmed === "Weather" ||
      trimmed === "Camera" ||
      trimmed === "Camera live stream";
    onSave({
      title: isPlaceholder ? undefined : trimmed,
      config,
    });
    onClose();
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 400 }, p: 2 } }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Typography variant="h6">Edit {label.toLowerCase()}</Typography>
        <Typography variant="caption" color="text.secondary">
          {type === "weather"
            ? "Forecast uses Latitude / Longitude (Open-Meteo). The location label is only the heading — use Look up to fill coordinates from a place name."
            : type === "device_status"
              ? "Optional title (default: Devices) and offline-only list."
              : type === "camera"
                ? "Choose a camera registered under Cameras. Stream plays via go2rtc."
                : `Optional title (default: ${label}). Data refreshes automatically.`}
        </Typography>

        <TextField
          label="Title (optional)"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "weather"
              ? weatherLocation || "Weather"
              : generalWidgetHeading(widget, label)
          }
          helperText={
            type === "weather"
              ? "Leave blank to use the location label below"
              : `Leave blank to use “${label}”`
          }
        />

        {type === "weather" && (
          <>
            <TextField
              label="Location / place name"
              size="small"
              fullWidth
              value={weatherLocation}
              onChange={(e) => {
                setWeatherLocation(e.target.value);
                setGeocodeHint(null);
              }}
              helperText="Heading text — does not change weather until you Look up or set lat/lon"
            />
            <Button
              variant="outlined"
              disabled={geocodeBusy}
              onClick={() => void lookupPlace()}
            >
              {geocodeBusy ? "Looking up…" : "Look up place → fill lat/lon"}
            </Button>
            {geocodeError && <Alert severity="error">{geocodeError}</Alert>}
            {geocodeHint && <Alert severity="success">{geocodeHint}</Alert>}
            <TextField
              label="Latitude"
              size="small"
              fullWidth
              value={weatherLat}
              onChange={(e) => setWeatherLat(e.target.value)}
              inputProps={{ inputMode: "decimal" }}
              helperText="North/south (−90 to 90). Your exact coords are sent; the forecast model picks the nearest grid cell."
            />
            <TextField
              label="Longitude"
              size="small"
              fullWidth
              value={weatherLon}
              onChange={(e) => setWeatherLon(e.target.value)}
              inputProps={{ inputMode: "decimal" }}
              helperText="East/west (−180 to 180). UK values are typically negative (e.g. −0.85)."
            />
            <Typography variant="caption" color="text.secondary">
              After Apply, save the dashboard so coordinates persist. UK locations use the Met
              Office model (~2 km). Phone apps may still differ slightly.
            </Typography>
          </>
        )}

        {type === "device_status" && (
          <FormControlLabel
            control={
              <Switch
                checked={offlineOnly}
                onChange={(e) => setOfflineOnly(e.target.checked)}
              />
            }
            label="Show offline devices only"
          />
        )}

        {type === "camera" && (
          <FormControl fullWidth size="small">
            <InputLabel id="camera-pick">Camera</InputLabel>
            <Select
              labelId="camera-pick"
              label="Camera"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {cameras.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                  {c.areaName ? ` · ${c.areaName}` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: "auto", pt: 2 }}>
          <Button variant="outlined" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleApply} fullWidth>
            Apply
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
