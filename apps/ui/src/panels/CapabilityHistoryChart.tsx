import { useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import ReactECharts from "echarts-for-react";
import type { HistoryPoint, HistoryRange, ResolvedPanelCapability } from "../api";
import { api } from "../api";
import { nestedContentPanelSx } from "../skins/surfaceStyles";
import { useGradientActive, useSolidContentPanels } from "../skins/useSurfaceStyles";
import { applyEchartsPalette, echartsPaletteFromTheme } from "../widgets/echarts/chart-theme";
import { applySafeChartTooltip } from "../widgets/echarts/chart-tooltip";
import { defaultRangeForKind } from "../widgets/echarts/config";
import { buildFinalOption } from "../widgets/echarts/merge-option";
import { getEchartsPreset } from "../widgets/echarts";
import { capabilityOptionPrimary } from "../lib/capability-picker";
import { asSwitchCapability } from "./panel-capabilities";
import { PanelItemChrome } from "./PanelItemChrome";

type PrefetchedHistory = {
  loading: boolean;
  error: string | null;
  points: HistoryPoint[];
};

type Props = {
  capability: ResolvedPanelCapability;
  range: HistoryRange;
  presetId?: string;
  chartMin?: number;
  chartMax?: number;
  compact?: boolean;
  /** Parent-loaded history (Charts panel batch request). */
  prefetched?: PrefetchedHistory;
};

function resolvePanelChartMinMax(
  capability: ResolvedPanelCapability,
  chartMin?: number,
  chartMax?: number
): { min: number; max: number } {
  const fallback = defaultRangeForKind(capability.kind);
  let { min, max } = fallback;
  if (chartMin !== undefined) min = chartMin;
  if (chartMax !== undefined) max = chartMax;
  if (min >= max) max = min + 1;
  return { min, max };
}

export function CapabilityHistoryChart({
  capability,
  range,
  presetId = "line-basic",
  chartMin,
  chartMax,
  compact = false,
  prefetched,
}: Props) {
  const theme = useTheme();
  const gradientActive = useGradientActive();
  const solidContentPanels = useSolidContentPanels();
  const itemSx = nestedContentPanelSx(theme, gradientActive, solidContentPanels);
  const chartPalette = useMemo(() => echartsPaletteFromTheme(theme), [theme]);
  const preset = getEchartsPreset(presetId);
  const hostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(prefetched?.loading ?? true);
  const [error, setError] = useState<string | null>(prefetched?.error ?? null);
  const [points, setPoints] = useState<HistoryPoint[]>(prefetched?.points ?? []);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (prefetched) {
      setLoading(prefetched.loading);
      setError(prefetched.error);
      setPoints(prefetched.points);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .history(capability.id, range)
      .then((res) => {
        if (cancelled) return;
        setPoints(res.points);
        if (res.points.length === 0) {
          setError("No data");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPoints([]);
        const message = err instanceof Error ? err.message : "Failed";
        setError(message.includes("HTTP 429") ? "Too many chart requests — wait a moment" : message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [capability.id, range, prefetched]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.floor(r.width));
      const h = Math.max(0, Math.floor(r.height));
      if (w > 0 && h > 0) {
        setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sizePx = box.w > 0 && box.h > 0 ? Math.min(box.w, box.h) : 120;

  const option = useMemo(() => {
    const { min, max } = resolvePanelChartMinMax(capability, chartMin, chartMax);
    const built = preset.buildOption({
      value: 0,
      unit: capability.unit ?? "",
      title: capability.name,
      kind: capability.kind,
      min,
      max,
      palette: chartPalette,
      points,
      range,
      sizePx,
    });
    const merged = buildFinalOption(built, undefined);
    return applyEchartsPalette(applySafeChartTooltip(merged), chartPalette);
  }, [preset, capability, chartMin, chartMax, points, range, chartPalette, sizePx]);

  const ready = box.w > 0 && box.h > 0;

  return (
    <PanelItemChrome
      cap={capability}
      title={capabilityOptionPrimary(asSwitchCapability(capability))}
      showContext={false}
      itemSx={itemSx}
      compact={compact}
    >
      <Box ref={hostRef} sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <CircularProgress size={22} />
          </Box>
        ) : error && points.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {error}
          </Typography>
        ) : ready ? (
          <ReactECharts
            option={option}
            style={{ width: box.w, height: box.h, display: "block" }}
            opts={{ renderer: "canvas" }}
          />
        ) : null}
      </Box>
    </PanelItemChrome>
  );
}
