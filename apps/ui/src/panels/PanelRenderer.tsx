import { normalizePanelKind } from "../lib/panel-kind";
import type { HistoryRange, ResolvedPanelCapability } from "../api";
import type { PanelAppearanceLayout } from "../lib/panel-appearance";
import { CameraPanel } from "./CameraPanel";
import { CalendarPanel } from "./CalendarPanel";
import { ChartsPanel } from "./ChartsPanel";
import { ControlsPanel } from "./ControlsPanel";
import { DevicesPanel } from "./DevicesPanel";
import { StatusPanel } from "./StatusPanel";
import { SystemPanel } from "./SystemPanel";
import { WeatherPanel } from "./WeatherPanel";

type Props = {
  panelKind: string;
  capabilities: ResolvedPanelCapability[];
  chartRange?: HistoryRange;
  chartPresetId?: string;
  chartMin?: number;
  chartMax?: number;
  panelLayout?: PanelAppearanceLayout;
  cameraAreaIds?: string[];
  weatherConfig?: Record<string, unknown>;
  devicesConfig?: Record<string, unknown>;
  /** Persisted dashboard tile title — never auto-filled from panel kind. */
  widgetTitle?: string | null;
};

export function PanelRenderer({
  panelKind,
  capabilities,
  chartRange,
  chartPresetId,
  chartMin,
  chartMax,
  panelLayout = "card",
  cameraAreaIds,
  weatherConfig,
  devicesConfig,
  widgetTitle,
}: Props) {
  const kind = normalizePanelKind(panelKind);
  const title = widgetTitle?.trim() || undefined;

  switch (kind) {
    case "panel.controls":
      return <ControlsPanel capabilities={capabilities} layout={panelLayout} />;
    case "panel.charts":
      return (
        <ChartsPanel
          capabilities={capabilities}
          range={chartRange ?? "24h"}
          presetId={chartPresetId}
          chartMin={chartMin}
          chartMax={chartMax}
          layout={panelLayout}
        />
      );
    case "panel.camera":
      return <CameraPanel areaIds={cameraAreaIds ?? []} layout={panelLayout} />;
    case "panel.weather":
      return <WeatherPanel config={weatherConfig} title={title} />;
    case "panel.calendar":
      return <CalendarPanel title={title} />;
    case "panel.devices":
      return <DevicesPanel config={devicesConfig} title={title} />;
    case "panel.system":
      return <SystemPanel title={title} />;
    case "panel.status":
      return <StatusPanel capabilities={capabilities} layout={panelLayout} />;
    default:
      return null;
  }
}
