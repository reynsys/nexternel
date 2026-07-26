import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { WidgetInstance } from "../api";
import {
  CLOCK_WIDGET_TYPE,
  type ClockAnalogStyle,
  type ClockDigitalStyle,
  type ClockTimeMode,
} from "@nexternel/plugin-example-clock";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

export function ClockWidgetEditor({ open, widget, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [timeMode, setTimeMode] = useState<ClockTimeMode>("digital");
  const [digitalStyle, setDigitalStyle] = useState<ClockDigitalStyle>("standard");
  const [analogStyle, setAnalogStyle] = useState<ClockAnalogStyle>("classic");
  const [showSeconds, setShowSeconds] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [hour12, setHour12] = useState<"locale" | "12" | "24">("locale");
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    if (!open || !widget) return;
    const c = widget.config ?? {};
    const raw = widget.title?.trim() ?? "";
    setTitle(raw && raw !== "Clock" && raw !== CLOCK_WIDGET_TYPE ? raw : "");
    setTimeMode(c.timeMode === "analog" ? "analog" : "digital");
    setDigitalStyle(
      c.digitalStyle === "mono" || c.digitalStyle === "bold" ? c.digitalStyle : "standard"
    );
    setAnalogStyle(
      c.analogStyle === "minimal" || c.analogStyle === "roman" ? c.analogStyle : "classic"
    );
    setShowSeconds(c.showSeconds !== false);
    setShowDate(c.showDate !== false);
    setHour12(c.hour12 === true ? "12" : c.hour12 === false ? "24" : "locale");
    setFontScale(
      typeof c.fontScale === "number" && Number.isFinite(c.fontScale) ? Number(c.fontScale) : 1
    );
  }, [open, widget]);

  if (!widget || widget.type !== CLOCK_WIDGET_TYPE) return null;

  function handleApply() {
    onSave({
      title: title.trim() || undefined,
      config: {
        ...widget.config,
        timeMode,
        digitalStyle,
        analogStyle,
        showSeconds,
        showDate,
        hour12: hour12 === "locale" ? undefined : hour12 === "12",
        fontScale,
      },
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
        <Typography variant="h6">Edit clock</Typography>
        <Typography variant="caption" color="text.secondary">
          Digits scale to fill the widget. Adjust style, seconds, date, and size.
        </Typography>

        <TextField
          label="Title (optional)"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leave blank to hide title and maximize the clock"
          helperText="Empty title = more room for the time"
        />

        <FormControl fullWidth size="small">
          <InputLabel id="clock-mode">Display</InputLabel>
          <Select
            labelId="clock-mode"
            label="Display"
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value as ClockTimeMode)}
          >
            <MenuItem value="digital">Digital</MenuItem>
            <MenuItem value="analog">Analog</MenuItem>
          </Select>
        </FormControl>

        {timeMode === "digital" ? (
          <>
            <FormControl fullWidth size="small">
              <InputLabel id="clock-dstyle">Font style</InputLabel>
              <Select
                labelId="clock-dstyle"
                label="Font style"
                value={digitalStyle}
                onChange={(e) => setDigitalStyle(e.target.value as ClockDigitalStyle)}
              >
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="mono">Monospace</MenuItem>
                <MenuItem value="bold">Bold compact</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="clock-hour">Hour format</InputLabel>
              <Select
                labelId="clock-hour"
                label="Hour format"
                value={hour12}
                onChange={(e) => setHour12(e.target.value as "locale" | "12" | "24")}
              >
                <MenuItem value="locale">Locale default</MenuItem>
                <MenuItem value="12">12-hour</MenuItem>
                <MenuItem value="24">24-hour</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={showSeconds}
                  onChange={(e) => setShowSeconds(e.target.checked)}
                />
              }
              label="Show seconds"
            />
            <FormControlLabel
              control={
                <Switch checked={showDate} onChange={(e) => setShowDate(e.target.checked)} />
              }
              label="Show date"
            />
            <Typography variant="caption" color="text.secondary">
              Digit size ({Math.round(fontScale * 100)}%)
            </Typography>
            <Slider
              value={fontScale}
              min={0.7}
              max={1.3}
              step={0.05}
              onChange={(_, v) => setFontScale(Array.isArray(v) ? v[0]! : v)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
            />
          </>
        ) : (
          <FormControl fullWidth size="small">
            <InputLabel id="clock-astyle">Analog style</InputLabel>
            <Select
              labelId="clock-astyle"
              label="Analog style"
              value={analogStyle}
              onChange={(e) => setAnalogStyle(e.target.value as ClockAnalogStyle)}
            >
              <MenuItem value="classic">Classic</MenuItem>
              <MenuItem value="minimal">Minimal</MenuItem>
              <MenuItem value="roman">Roman numerals</MenuItem>
            </Select>
          </FormControl>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: "auto" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
