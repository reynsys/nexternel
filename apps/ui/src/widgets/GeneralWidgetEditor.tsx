import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { WidgetInstance } from "../api";
import {
  generalWidgetHeading,
  isGeneralWidgetType,
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
};

export function GeneralWidgetEditor({ open, widget, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [weatherLocation, setWeatherLocation] = useState("London");
  const [weatherLat, setWeatherLat] = useState("51.5074");
  const [weatherLon, setWeatherLon] = useState("-0.1278");
  const [offlineOnly, setOfflineOnly] = useState(false);

  useEffect(() => {
    if (!open || !widget || !isGeneralWidgetType(widget.type)) return;
    const type = widget.type as GeneralWidgetType;
    const label = TYPE_LABELS[type];
    if (type === "weather") {
      const w = parseWeatherConfig(widget.config);
      const loc = w.weatherLocation === "Weather" ? "London" : w.weatherLocation;
      setWeatherLocation(loc);
      setWeatherLat(String(w.weatherLat));
      setWeatherLon(String(w.weatherLon));
      // Title field shows custom override; location is the default heading
      setTitle(widgetTitleOr(widget, "Weather") ?? "");
    } else {
      const custom = widgetTitleOr(widget, label);
      setTitle(custom ?? "");
    }
    setOfflineOnly(parseDeviceStatusConfig(widget.config).offlineOnly);
  }, [open, widget?.id]);

  if (!widget || !isGeneralWidgetType(widget.type)) return null;

  const type = widget.type;
  const label = TYPE_LABELS[type];

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
    const trimmed = title.trim();
    const isPlaceholder =
      !trimmed ||
      trimmed === label ||
      trimmed === type ||
      trimmed === "System information" ||
      trimmed === "Device status" ||
      trimmed === "Calendar" ||
      trimmed === "Weather";
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
            ? "Location label is the heading. Optional Title overrides it."
            : type === "device_status"
              ? "Optional title (default: Devices) and offline-only list."
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
              label="Location label"
              size="small"
              fullWidth
              value={weatherLocation}
              onChange={(e) => setWeatherLocation(e.target.value)}
              helperText="Default heading when Title is empty"
            />
            <TextField
              label="Latitude"
              size="small"
              fullWidth
              value={weatherLat}
              onChange={(e) => setWeatherLat(e.target.value)}
              inputProps={{ inputMode: "decimal" }}
            />
            <TextField
              label="Longitude"
              size="small"
              fullWidth
              value={weatherLon}
              onChange={(e) => setWeatherLon(e.target.value)}
              inputProps={{ inputMode: "decimal" }}
            />
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
