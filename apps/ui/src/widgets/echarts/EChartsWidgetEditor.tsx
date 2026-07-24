import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import type { Capability, HistoryRange, WidgetInstance } from "../../api";
import { EChartsWidgetBody } from "./EChartsWidgetBody";
import { parseEchartsConfig } from "./config";
import { getEchartsPreset, listEchartsFamilies, listEchartsPresets } from "./registry";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  capabilities: Capability[];
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

export function EChartsWidgetEditor({
  open,
  widget,
  capabilities,
  onClose,
  onSave,
}: Props) {
  const [presetId, setPresetId] = useState("gauge");
  const [title, setTitle] = useState("");
  const [capabilityId, setCapabilityId] = useState("");
  const [minStr, setMinStr] = useState("");
  const [maxStr, setMaxStr] = useState("");
  const [accent, setAccent] = useState("");
  const [range, setRange] = useState<HistoryRange>("24h");
  const [overrideText, setOverrideText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState("all");

  useEffect(() => {
    if (!open || !widget) return;
    const cfg = parseEchartsConfig(widget.config);
    setPresetId(cfg.presetId);
    setTitle(widget.title ?? "");
    setCapabilityId(
      typeof widget.bindings.capabilityId === "string" ? widget.bindings.capabilityId : ""
    );
    setMinStr(cfg.min !== undefined ? String(cfg.min) : "");
    setMaxStr(cfg.max !== undefined ? String(cfg.max) : "");
    setAccent(cfg.accent ?? "");
    setRange(cfg.range ?? "24h");
    setOverrideText(cfg.optionOverride ? JSON.stringify(cfg.optionOverride, null, 2) : "");
    setJsonError(null);
    setFamilyFilter("all");
  }, [open, widget]);

  const preset = getEchartsPreset(presetId);
  const families = listEchartsFamilies();
  const presets = listEchartsPresets().filter(
    (p) =>
      familyFilter === "all" ||
      p.family === familyFilter ||
      p.id === presetId
  );

  const previewWidget: WidgetInstance | null = useMemo(() => {
    if (!widget) return null;
    let optionOverride: Record<string, unknown> | undefined;
    if (overrideText.trim()) {
      try {
        const parsed = JSON.parse(overrideText) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return {
            ...widget,
            title: title || widget.title,
            type: "echarts",
            bindings: capabilityId ? { capabilityId } : {},
            config: {
              ...widget.config,
              presetId,
              range,
              accent: accent || undefined,
              min: minStr === "" ? undefined : Number(minStr),
              max: maxStr === "" ? undefined : Number(maxStr),
            },
          };
        }
        optionOverride = parsed as Record<string, unknown>;
      } catch {
        /* keep previous preview without override */
      }
    }
    const min = minStr === "" ? undefined : Number(minStr);
    const max = maxStr === "" ? undefined : Number(maxStr);
    return {
      ...widget,
      title: title || widget.title,
      type: "echarts",
      bindings: capabilityId ? { capabilityId } : {},
      config: {
        ...widget.config,
        presetId,
        range,
        accent: accent || undefined,
        min: min !== undefined && !Number.isNaN(min) ? min : undefined,
        max: max !== undefined && !Number.isNaN(max) ? max : undefined,
        optionOverride,
      },
    };
  }, [
    widget,
    title,
    capabilityId,
    presetId,
    range,
    accent,
    minStr,
    maxStr,
    overrideText,
  ]);

  const cap = capabilities.find((c) => c.id === capabilityId);

  function handleApply() {
    let optionOverride: Record<string, unknown> | undefined;
    if (overrideText.trim()) {
      try {
        const parsed = JSON.parse(overrideText) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setJsonError("optionOverride must be a JSON object");
          return;
        }
        optionOverride = parsed as Record<string, unknown>;
        setJsonError(null);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : "Invalid JSON");
        return;
      }
    } else {
      setJsonError(null);
    }
    const min = minStr === "" ? undefined : Number(minStr);
    const max = maxStr === "" ? undefined : Number(maxStr);
    if (minStr !== "" && Number.isNaN(min)) {
      setJsonError("Min must be a number");
      return;
    }
    if (maxStr !== "" && Number.isNaN(max)) {
      setJsonError("Max must be a number");
      return;
    }
    onSave({
      title: title.trim() || undefined,
      type: "echarts",
      bindings: capabilityId ? { capabilityId } : {},
      config: {
        presetId,
        range: preset.dataMode === "history" ? range : undefined,
        accent: accent.trim() || undefined,
        min,
        max,
        optionOverride,
      },
    });
    onClose();
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 2 } }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Typography variant="h6">Edit ECharts widget</Typography>
        <Typography variant="caption" color="text.secondary">
          Preset + common fields. Use Advanced JSON for any ECharts option (merged on top;
          bound series data is kept unless you set data explicitly).
        </Typography>

        <TextField
          label="Title"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <FormControl fullWidth size="small">
          <InputLabel id="echarts-family">Family</InputLabel>
          <Select
            labelId="echarts-family"
            label="Family"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
          >
            <MenuItem value="all">All families</MenuItem>
            {families.map((f) => (
              <MenuItem key={f} value={f}>
                {f}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="echarts-preset">Preset</InputLabel>
          <Select
            labelId="echarts-preset"
            label="Preset"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {presets.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          {preset.description}
        </Typography>

        {preset.needsCapability && (
          <FormControl fullWidth size="small">
            <InputLabel id="echarts-cap">Capability</InputLabel>
            <Select
              labelId="echarts-cap"
              label="Capability"
              value={capabilityId}
              onChange={(e) => setCapabilityId(e.target.value)}
            >
              {capabilities
                .filter((c) =>
                  preset.dataMode === "history" ? c.kind !== "switch" : true
                )
                .map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.deviceName} · {c.name} ({c.kind})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}

        {preset.dataMode === "history" && (
          <FormControl fullWidth size="small">
            <InputLabel id="echarts-range">History range</InputLabel>
            <Select
              labelId="echarts-range"
              label="History range"
              value={range}
              onChange={(e) => setRange(e.target.value as HistoryRange)}
            >
              <MenuItem value="1h">Last 1 hour</MenuItem>
              <MenuItem value="6h">Last 6 hours</MenuItem>
              <MenuItem value="24h">Last 24 hours</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
            </Select>
          </FormControl>
        )}

        <Stack direction="row" spacing={1}>
          <TextField
            label="Min"
            size="small"
            fullWidth
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            placeholder="auto"
          />
          <TextField
            label="Max"
            size="small"
            fullWidth
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
            placeholder="auto"
          />
        </Stack>

        <TextField
          label="Accent color"
          size="small"
          fullWidth
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          placeholder="#5470c6"
          helperText="CSS color used by presets that support accent"
        />

        <Divider />
        <Typography variant="subtitle2">Advanced — optionOverride (JSON)</Typography>
        <TextField
          multiline
          minRows={6}
          maxRows={14}
          fullWidth
          size="small"
          value={overrideText}
          onChange={(e) => {
            setOverrideText(e.target.value);
            setJsonError(null);
          }}
          placeholder='{ "series": [{ "axisLine": { "lineStyle": { "width": 20 } } }] }'
          sx={{ fontFamily: "ui-monospace, monospace", "& textarea": { fontFamily: "inherit" } }}
        />
        <Button size="small" onClick={() => setOverrideText("")}>
          Reset override
        </Button>
        {jsonError && <Alert severity="error">{jsonError}</Alert>}

        <Typography variant="subtitle2">Preview</Typography>
        <Box
          sx={{
            height: 180,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 1,
            flexShrink: 0,
          }}
        >
          {previewWidget && (
            <EChartsWidgetBody
              widget={previewWidget}
              cap={cap}
              title={title || previewWidget.title || preset.label}
            />
          )}
        </Box>

        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
