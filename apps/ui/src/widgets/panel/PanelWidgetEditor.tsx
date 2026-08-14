import { useEffect, useMemo, useState } from "react";

import {

  Button,

  Checkbox,

  Dialog,

  DialogActions,

  DialogContent,

  DialogTitle,

  FormControl,

  FormControlLabel,

  InputLabel,

  MenuItem,

  Select,

  Stack,

  TextField,

  Typography,

} from "@mui/material";

import type { PanelContentMode } from "@nexternel/domain";

import { api, type HistoryRange, type ResolvedPanelCapability, type WidgetInstance } from "../../api";

import { PanelContentFields } from "../../components/PanelContentFields";

import { PanelChartPresetFields } from "../../components/PanelChartPresetFields";

import { AREA } from "../../lib/area-labels";

import { loadSystemsInScope } from "../../lib/panel-catalog";

import {

  readPanelAppearanceLayout,

  type PanelAppearanceLayout,

} from "../../lib/panel-appearance";

import {
  readPanelChartMinMax,
  readPanelChartPreset,
  readPanelChartRange,
} from "../../lib/panel-chart-config";

import { normalizePanelKind } from "../../lib/panel-kind";

import {

  buildPanelScopeConfig,

  previewPanelScopeForItemOptions,

  previewPanelScopeFromEditorFields,

  readPanelContentMode,

} from "../../lib/panel-scope";

import { panelIsIntegrationKind, panelUsesAreaScope, panelUsesCapabilityScope } from "@nexternel/domain";

import { readPanelScope } from "./registry";



type Props = {

  open: boolean;

  widget: WidgetInstance;

  sectionRoomId?: string | null;

  sectionTitle?: string;

  onClose: () => void;

  onSave: (patch: Partial<WidgetInstance>) => void;

};



const CHART_RANGES: HistoryRange[] = ["1h", "6h", "24h", "7d"];



export function PanelWidgetEditor({

  open,

  widget,

  sectionRoomId,

  sectionTitle,

  onClose,

  onSave,

}: Props) {

  const panelKind = normalizePanelKind(widget.type);

  const isCharts = panelKind === "panel.charts";

  const showLayout = !panelIsIntegrationKind(panelKind);

  const existing = readPanelScope(widget);

  const showAreaScope = panelUsesAreaScope(widget.type);

  const showSystemFilter = panelUsesCapabilityScope(widget.type);

  const [title, setTitle] = useState(widget.title ?? "");

  const [inheritSection, setInheritSection] = useState(

    existing.inheritSectionArea ?? Boolean(sectionRoomId)

  );

  const [areaId, setAreaId] = useState(existing.areaIds?.[0] ?? "");

  const [systemIds, setSystemIds] = useState<string[]>(existing.systemIds ?? []);

  const [contentMode, setContentMode] = useState<PanelContentMode>(

    readPanelContentMode(existing, widget.type)

  );

  const [capabilityIds, setCapabilityIds] = useState<string[]>(existing.capabilityIds ?? []);

  const [appearanceLayout, setAppearanceLayout] = useState<PanelAppearanceLayout>(

    readPanelAppearanceLayout(widget.config)

  );

  const [chartRange, setChartRange] = useState<HistoryRange>(readPanelChartRange(widget.config));

  const [chartPresetId, setChartPresetId] = useState(readPanelChartPreset(widget.config));

  const [chartMinStr, setChartMinStr] = useState("");

  const [chartMaxStr, setChartMaxStr] = useState("");

  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);

  const [scopedSystems, setScopedSystems] = useState<{ id: string; label: string }[]>([]);

  const [scopeCapabilities, setScopeCapabilities] = useState<ResolvedPanelCapability[]>([]);



  const previewScope = useMemo(

    () =>

      previewPanelScopeFromEditorFields({

        inheritSectionArea: inheritSection,

        sectionRoomId: sectionRoomId ?? null,

        areaId,

        systemIds,

        groupIds: existing.groupIds ?? [],

        contentMode,

        capabilityIds,

      }),

    [inheritSection, sectionRoomId, areaId, systemIds, existing.groupIds, contentMode, capabilityIds]

  );



  const previewScopeKey = `${previewScope.contentMode}|${previewScope.areaIds.join(",")}|${previewScope.systemIds.join(",")}|${previewScope.groupIds.join(",")}|${previewScope.capabilityIds.join(",")}`;



  useEffect(() => {

    if (!open) return;

    const scope = readPanelScope(widget);

    setTitle(widget.title ?? "");

    setInheritSection(scope.inheritSectionArea ?? Boolean(sectionRoomId));

    setAreaId(scope.areaIds?.[0] ?? "");

    setSystemIds(scope.systemIds ?? []);

    setContentMode(readPanelContentMode(scope, widget.type));

    setCapabilityIds(scope.capabilityIds ?? []);

    setAppearanceLayout(readPanelAppearanceLayout(widget.config));

    setChartRange(readPanelChartRange(widget.config));

    const chartBounds = readPanelChartMinMax(widget.config);

    setChartPresetId(readPanelChartPreset(widget.config));

    setChartMinStr(chartBounds.min !== undefined ? String(chartBounds.min) : "");

    setChartMaxStr(chartBounds.max !== undefined ? String(chartBounds.max) : "");

    void api.rooms().then((r) => {

      setAreas(r.rooms.map((room) => ({ id: room.id, name: room.name })));

    });

  }, [open, widget, sectionRoomId]);



  useEffect(() => {

    if (!open) return;

    void loadSystemsInScope(previewScope.areaIds).then((systems) => {

      setScopedSystems(systems);

      setSystemIds((prev) => prev.filter((id) => systems.some((s) => s.id === id)));

    });

  }, [open, previewScopeKey]);



  useEffect(() => {

    if (!open || !showSystemFilter) return;

    const optionsScope = previewPanelScopeForItemOptions({

      inheritSectionArea: inheritSection,

      sectionRoomId: sectionRoomId ?? null,

      areaId,

      systemIds,

      groupIds: existing.groupIds ?? [],

    });

    void api

      .v4ResolvePanel({

        panelKind: widget.type,

        panelScope: optionsScope,

      })

      .then((result) => {

        setScopeCapabilities(result.capabilities);

        setCapabilityIds((prev) =>

          prev.filter((id) => result.capabilities.some((c) => c.id === id))

        );

      })

      .catch(() => setScopeCapabilities([]));

  }, [open, showSystemFilter, widget.type, previewScopeKey, inheritSection, sectionRoomId, areaId, systemIds, existing.groupIds]);



  useEffect(() => {

    if (contentMode === "auto") {

      setCapabilityIds([]);

    }

  }, [contentMode]);



  function handleSave() {

    const areaIds =

      !inheritSection && areaId

        ? [areaId]

        : inheritSection

          ? []

          : existing.areaIds ?? [];

    const prevAppearance =

      widget.config?.appearance && typeof widget.config.appearance === "object"

        ? (widget.config.appearance as Record<string, unknown>)

        : {};

    const chartMin = chartMinStr.trim() ? Number(chartMinStr) : undefined;

    const chartMax = chartMaxStr.trim() ? Number(chartMaxStr) : undefined;

    const nextConfig: Record<string, unknown> = {
      ...widget.config,
      panelScope: buildPanelScopeConfig({
        inheritSectionArea: inheritSection,
        areaIds,
        systemIds,
        groupIds: existing.groupIds ?? [],
        contentMode,
        capabilityIds,
      }),
      appearance: {
        ...prevAppearance,
        layout: appearanceLayout,
      },
    };

    if (isCharts) {
      nextConfig.chartRange = chartRange;
      nextConfig.chartPresetId = chartPresetId;
      if (chartMin !== undefined && Number.isFinite(chartMin)) {
        nextConfig.chartMin = chartMin;
      } else {
        delete nextConfig.chartMin;
      }
      if (chartMax !== undefined && Number.isFinite(chartMax)) {
        nextConfig.chartMax = chartMax;
      } else {
        delete nextConfig.chartMax;
      }
    }

    onSave({

      title: title.trim() || undefined,

      config: nextConfig,

    });

    onClose();

  }



  return (

    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">

      <DialogTitle>Edit panel</DialogTitle>

      <DialogContent>

        <Stack spacing={2} sx={{ mt: 1 }}>

          <TextField

            label="Title"

            value={title}

            onChange={(e) => setTitle(e.target.value)}

            fullWidth

            helperText="Optional — shown on the dashboard when set"

          />

          {isCharts && (

            <FormControl fullWidth>

              <InputLabel id="panel-edit-chart-range">History range</InputLabel>

              <Select

                labelId="panel-edit-chart-range"

                label="History range"

                value={chartRange}

                onChange={(e) => setChartRange(e.target.value as HistoryRange)}

              >

                {CHART_RANGES.map((r) => (

                  <MenuItem key={r} value={r}>

                    {r}

                  </MenuItem>

                ))}

              </Select>

            </FormControl>

          )}

          {isCharts && (

            <PanelChartPresetFields

              presetId={chartPresetId}

              onPresetIdChange={setChartPresetId}

              minStr={chartMinStr}

              maxStr={chartMaxStr}

              onMinStrChange={setChartMinStr}

              onMaxStrChange={setChartMaxStr}

            />

          )}

          {showLayout && (

            <FormControl fullWidth>

              <InputLabel id="panel-edit-layout">Layout</InputLabel>

              <Select

                labelId="panel-edit-layout"

                label="Layout"

                value={appearanceLayout}

                onChange={(e) => setAppearanceLayout(e.target.value as PanelAppearanceLayout)}

              >

                <MenuItem value="card">Card</MenuItem>

                <MenuItem value="compact">Compact</MenuItem>

                <MenuItem value="grid">Grid</MenuItem>

              </Select>

            </FormControl>

          )}

          {showLayout && (

            <Typography variant="caption" color="text.secondary">

              Layout sets how many items share a row (up to 2 / 3 / 4 columns). Resize the

              panel to grow each item.

            </Typography>

          )}

          {showAreaScope && sectionRoomId && (

            <FormControlLabel

              control={

                <Checkbox

                  checked={inheritSection}

                  onChange={(e) => setInheritSection(e.target.checked)}

                />

              }

              label={`Use this section${sectionTitle ? ` (${sectionTitle})` : ""}`}

            />

          )}

          {showAreaScope && !inheritSection && (

            <FormControl fullWidth>

              <InputLabel id="panel-edit-area">{AREA.singular}</InputLabel>

              <Select

                labelId="panel-edit-area"

                label={AREA.singular}

                value={areaId}

                onChange={(e) => setAreaId(e.target.value)}

              >

                <MenuItem value="">All {AREA.plural.toLowerCase()}</MenuItem>

                {areas.map((a) => (

                  <MenuItem key={a.id} value={a.id}>

                    {a.name}

                  </MenuItem>

                ))}

              </Select>

            </FormControl>

          )}

          {showSystemFilter && scopedSystems.length > 0 && (

            <FormControl fullWidth>

              <InputLabel id="panel-edit-systems">Category (optional)</InputLabel>

              <Select

                labelId="panel-edit-systems"

                label="Category (optional)"

                multiple

                value={systemIds}

                onChange={(e) => {

                  const value = e.target.value;

                  setSystemIds(typeof value === "string" ? value.split(",") : value);

                }}

                renderValue={(selected) =>

                  selected.length === 0

                    ? "All categories in scope"

                    : selected

                        .map((id) => scopedSystems.find((s) => s.id === id)?.label ?? id)

                        .join(", ")

                }

              >

                {scopedSystems.map((s) => (

                  <MenuItem key={s.id} value={s.id}>

                    <Checkbox checked={systemIds.includes(s.id)} />

                    {s.label}

                  </MenuItem>

                ))}

              </Select>

            </FormControl>

          )}

          {showSystemFilter && (

            <PanelContentFields

              panelKind={widget.type}

              contentMode={contentMode}

              onContentModeChange={setContentMode}

              capabilityIds={capabilityIds}

              onCapabilityIdsChange={setCapabilityIds}

              options={scopeCapabilities}

            />

          )}

        </Stack>

      </DialogContent>

      <DialogActions>

        <Button onClick={onClose}>Cancel</Button>

        <Button variant="contained" onClick={handleSave}>

          Apply

        </Button>

      </DialogActions>

    </Dialog>

  );

}

