import { useMemo } from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";
import type { WidgetInstance } from "../../api";
import { DashboardTileBody } from "../../components/DashboardTileBody";
import { effectivePanelScope } from "../../lib/panel-scope";
import {
  readPanelChartMinMax,
  readPanelChartPreset,
  readPanelChartRange,
} from "../../lib/panel-chart-config";
import { readPanelAppearanceLayout } from "../../lib/panel-appearance";
import {
  isIntegrationPanelKind,
  readPanelDevicesConfig,
  readPanelWeatherConfig,
} from "../../lib/panel-integration";
import { PanelRenderer } from "../../panels/PanelRenderer";
import { useResolvedPanel } from "../../panels/useResolvedPanel";
import { normalizedPanelKind, readPanelScope } from "./registry";

type Props = {
  widget: WidgetInstance;
  sectionRoomId?: string | null;
};

export function PanelWidget({ widget, sectionRoomId }: Props) {
  const scopeConfig = readPanelScope(widget);
  const panelKind = normalizedPanelKind(widget.type);
  const resolvedScope = useMemo(
    () => effectivePanelScope(scopeConfig, sectionRoomId ?? null),
    [scopeConfig, sectionRoomId]
  );
  const { capabilities, loading, error } = useResolvedPanel(panelKind, resolvedScope);
  const chartRange = readPanelChartRange(widget.config);
  const chartPresetId = readPanelChartPreset(widget.config);
  const { min: chartMin, max: chartMax } = readPanelChartMinMax(widget.config);
  const appearanceLayout = readPanelAppearanceLayout(widget.config);
  const weatherConfig = readPanelWeatherConfig(widget.config);
  const devicesConfig = readPanelDevicesConfig(widget.config);
  const title = widget.title?.trim() || null;
  const isIntegration = isIntegrationPanelKind(panelKind);

  const body = isIntegration ? (
    <PanelRenderer
      panelKind={panelKind}
      capabilities={[]}
      cameraAreaIds={resolvedScope.areaIds}
      weatherConfig={weatherConfig}
      devicesConfig={devicesConfig}
      widgetTitle={title}
      panelLayout={appearanceLayout}
    />
  ) : loading ? (
    <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 2 }}>
      <CircularProgress size={24} />
    </Stack>
  ) : error ? (
    <Typography variant="body2" color="error">
      {error}
    </Typography>
  ) : (
    <PanelRenderer
      panelKind={panelKind}
      capabilities={capabilities}
      chartRange={chartRange}
      chartPresetId={chartPresetId}
      chartMin={chartMin}
      chartMax={chartMax}
      panelLayout={appearanceLayout}
    />
  );

  return (
    <DashboardTileBody widgetId={widget.id} widgetType={widget.type}>
      {body}
    </DashboardTileBody>
  );
}
