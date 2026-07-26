import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import type { Capability, HistoryRange, WidgetInstance } from "../../api";
import {
  editorTitleForBoundWidget,
  persistBoundWidgetTitle,
} from "../../lib/widget-title";
import { EChartsWidgetBody } from "./EChartsWidgetBody";
import { parseEchartsConfig } from "./config";
import type { EchartsPreset } from "./types";
import {
  getEchartsFamilyMeta,
  getEchartsPreset,
  groupEchartsPresetsByFamily,
  listEchartsPresets,
} from "./registry";
import { listEchartsFamilyMeta } from "./families";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  capabilities: Capability[];
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

/** Edit scope — what kind of component is being edited (not a free mix of all presets). */
type EditScope = "gauge" | "history" | "liveDiagram" | "custom";

function editScopeForPreset(p: EchartsPreset): EditScope {
  if (p.family === "gauge") return "gauge";
  if (p.dataMode === "history" || p.category === "history") return "history";
  if (p.dataMode === "none" || p.family === "custom") return "custom";
  return "liveDiagram";
}

function presetsInScope(scope: EditScope): EchartsPreset[] {
  return listEchartsPresets().filter((p) => editScopeForPreset(p) === scope);
}

function familyOptionsInScope(scope: EditScope) {
  const present = new Set(presetsInScope(scope).map((p) => p.family));
  return listEchartsFamilyMeta().filter((f) => present.has(f.id));
}

function editorTitle(scope: EditScope): string {
  if (scope === "gauge") return "Edit gauge";
  if (scope === "history") return "Edit chart";
  if (scope === "custom") return "Edit blank ECharts";
  return "Edit sensor diagram";
}

function scopeAllLabel(scope: EditScope): string {
  if (scope === "history") return "All chart types";
  if (scope === "liveDiagram") return "All diagram types";
  return "All types";
}

function componentTypeLabel(scope: EditScope): string {
  if (scope === "history") return "Chart type";
  if (scope === "liveDiagram") return "Diagram type";
  return "Component type";
}

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
  const [editScope, setEditScope] = useState<EditScope>("gauge");
  const [familyFilter, setFamilyFilter] = useState("all");

  useEffect(() => {
    if (!open || !widget) return;
    const cfg = parseEchartsConfig(widget.config);
    const current = getEchartsPreset(cfg.presetId);
    const scope = editScopeForPreset(current);
    const capId =
      typeof widget.bindings.capabilityId === "string" ? widget.bindings.capabilityId : "";
    const cap = capabilities.find((c) => c.id === capId);
    setPresetId(cfg.presetId);
    setTitle(editorTitleForBoundWidget(widget, cap));
    setCapabilityId(capId);
    setMinStr(cfg.min !== undefined ? String(cfg.min) : "");
    setMaxStr(cfg.max !== undefined ? String(cfg.max) : "");
    setAccent(cfg.accent ?? "");
    setRange(cfg.range ?? "24h");
    setOverrideText(cfg.optionOverride ? JSON.stringify(cfg.optionOverride, null, 2) : "");
    setJsonError(null);
    setEditScope(scope);
    setFamilyFilter(current.family);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/widget.id only
  }, [open, widget?.id]);

  const preset = getEchartsPreset(presetId);
  const scopedPresets = presetsInScope(editScope);
  const familyOptions = familyOptionsInScope(editScope);
  const showFamilySelect = familyOptions.length > 1;
  const filteredPresets = scopedPresets.filter(
    (p) =>
      familyFilter === "all" ||
      p.family === familyFilter ||
      p.id === presetId
  );
  const groupedPresets = groupEchartsPresetsByFamily(filteredPresets);
  const familyMeta = getEchartsFamilyMeta(preset.family);
  const typeLabel = componentTypeLabel(editScope);

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
    if (!widget) return;
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
      title:
        persistBoundWidgetTitle(title, widget.type, cap) ??
        (title.trim() || undefined),
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
        <Typography variant="h6">{editorTitle(editScope)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {editScope === "gauge"
            ? "Pick a gauge style (ECharts gauge). To add a history chart, use Add widget → Charts (history)."
            : editScope === "history"
              ? "Pick a chart type (line, area, bar, …). Gauges are under Sensors — add a new widget to switch."
              : editScope === "liveDiagram"
                ? "Pie, radar, or funnel for a live value."
                : "Blank ECharts shell — configure with Advanced JSON."}
        </Typography>

        <TextField
          label="Title"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {showFamilySelect && (
          <FormControl fullWidth size="small">
            <InputLabel id="echarts-family">{typeLabel}</InputLabel>
            <Select
              labelId="echarts-family"
              label={typeLabel}
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
            >
              <MenuItem value="all">{scopeAllLabel(editScope)}</MenuItem>
              {familyOptions.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  <Stack spacing={0} sx={{ py: 0.25 }}>
                    <Typography variant="body2">{f.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.hint}
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {showFamilySelect && familyFilter !== "all" && (
          <Typography variant="caption" color="text.secondary">
            {getEchartsFamilyMeta(familyFilter).hint}
          </Typography>
        )}

        <FormControl fullWidth size="small">
          <InputLabel id="echarts-preset">
            {editScope === "gauge" ? "Gauge style" : "Preset"}
          </InputLabel>
          <Select
            labelId="echarts-preset"
            label={editScope === "gauge" ? "Gauge style" : "Preset"}
            value={presetId}
            onChange={(e) => {
              const nextId = e.target.value;
              setPresetId(nextId);
              setFamilyFilter(getEchartsPreset(nextId).family);
            }}
          >
            {groupedPresets.flatMap(({ family, presets: list }) => [
              ...(showFamilySelect && familyFilter === "all"
                ? [<ListSubheader key={`h-${family.id}`}>{family.label}</ListSubheader>]
                : []),
              ...list.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.label}
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          {familyMeta.label}: {preset.description}
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
