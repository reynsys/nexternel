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
  isGeneralWidgetType,
  parseDeviceStatusConfig,
  parseWeatherConfig,
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
  system_info: "System information",
  device_status: "Device status",
};

export function GeneralWidgetEditor({ open, widget, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [weatherLocation, setWeatherLocation] = useState("London");
  const [weatherLat, setWeatherLat] = useState("51.5074");
  const [weatherLon, setWeatherLon] = useState("-0.1278");
  const [offlineOnly, setOfflineOnly] = useState(false);

  useEffect(() => {
    if (!open || !widget || !isGeneralWidgetType(widget.type)) return;
    setTitle(widget.title ?? "");
    const w = parseWeatherConfig(widget.config);
    setWeatherLocation(w.weatherLocation === "Weather" ? "London" : w.weatherLocation);
    setWeatherLat(String(w.weatherLat));
    setWeatherLon(String(w.weatherLon));
    setOfflineOnly(parseDeviceStatusConfig(widget.config).offlineOnly);
  }, [open, widget]);

  if (!widget || !isGeneralWidgetType(widget.type)) return null;

  const type = widget.type;
  const label = TYPE_LABELS[type];

  function handleApply() {
    const config: Record<string, unknown> = { ...(widget.config ?? {}) };
    if (type === "weather") {
      const lat = Number(weatherLat);
      const lon = Number(weatherLon);
      config.weatherLocation = weatherLocation.trim() || "Weather";
      config.weatherLat = Number.isFinite(lat) ? lat : 51.5074;
      config.weatherLon = Number.isFinite(lon) ? lon : -0.1278;
    }
    if (type === "device_status") {
      config.offlineOnly = offlineOnly;
    }
    onSave({
      title: title.trim() || undefined,
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
            ? "Set location label and coordinates (Open-Meteo via API)."
            : type === "device_status"
              ? "Optional title and whether to list offline devices only."
              : "Optional title. Data refreshes automatically."}
        </Typography>

        <TextField
          label="Title (optional)"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={label}
        />

        {type === "weather" && (
          <>
            <TextField
              label="Location label"
              size="small"
              fullWidth
              value={weatherLocation}
              onChange={(e) => setWeatherLocation(e.target.value)}
              helperText="Shown as the weather heading"
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
