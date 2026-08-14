import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import ReactECharts from "echarts-for-react";
import type { ECharts } from "echarts";
import type { Capability, HistoryRange, WidgetInstance } from "../../api";
import { api } from "../../api";
import {
  liveValue,
  parseEchartsConfig,
  resolveMinMax,
} from "./config";
import { primaryCapabilityId } from "../../lib/widget-bindings";
import { buildFinalOption } from "./merge-option";
import { applyEchartsPalette, echartsPaletteFromTheme } from "./chart-theme";
import { applySafeChartTooltip } from "./chart-tooltip";
import { enforceAllGaugeSeries, niceGaugeAxis } from "./gauge-scale";
import { getEchartsPreset } from "./registry";
import type { EchartsBuildCtx, HistoryPoint } from "./types";

function capabilityIdOf(widget: WidgetInstance): string | null {
  const id = primaryCapabilityId(widget.bindings);
  return id ?? null;
}

/** Stroke/font scale for gauge presets. */
function bucketGaugeSizePx(w: number, h: number): number {
  if (w <= 0 || h <= 0) return 220;
  const side = Math.min(w, h);
  return Math.max(80, Math.round(side / 8) * 8);
}

function measureHost(el: HTMLElement): { w: number; h: number } | null {
  const r = el.getBoundingClientRect();
  const w = Math.max(0, Math.floor(r.width));
  const h = Math.max(0, Math.floor(r.height));
  return w > 0 && h > 0 ? { w, h } : null;
}

/**
 * Chart body — single sizing authority: [data-nx-chart-host] flex-fills the
 * panel dial slot. Scale is measured once before the chart mounts so
 * valueAnimation is not restarted by a later option rebuild.
 */
export function EChartsWidgetBody({
  widget,
  cap,
  dataLabel,
  tileTitle = null,
}: {
  widget: WidgetInstance;
  cap: Capability | undefined;
  dataLabel: string;
  tileTitle?: string | null;
}) {
  const config = parseEchartsConfig(widget.config);
  const preset = getEchartsPreset(config.presetId);
  const theme = useTheme();
  const chartPalette = useMemo(() => echartsPaletteFromTheme(theme), [theme]);
  const range: HistoryRange = config.range ?? "24h";
  const capabilityId = capabilityIdOf(widget);
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const hostSizeRef = useRef({ w: 0, h: 0 });
  /** null until host is measured — chart mounts once with final stroke scale. */
  const [scalePx, setScalePx] = useState<number | null>(null);

  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsHistory = preset.dataMode === "history";
  const isGauge = preset.family === "gauge";

  useLayoutEffect(() => {
    setScalePx(null);
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;
    const applyMeasure = () => {
      if (cancelled) return;
      const size = measureHost(el);
      if (!size) return;
      hostSizeRef.current = size;
      el.setAttribute("data-nx-chart-w", String(size.w));
      el.setAttribute("data-nx-chart-h", String(size.h));
      setScalePx(bucketGaugeSizePx(size.w, size.h));
    };

    applyMeasure();
    if (hostSizeRef.current.w <= 0) {
      const id = requestAnimationFrame(applyMeasure);
      return () => {
        cancelled = true;
        cancelAnimationFrame(id);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [config.presetId]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const measure = () => {
      const size = measureHost(el);
      if (!size) return;

      chartRef.current?.resize({ width: size.w, height: size.h });

      const prev = hostSizeRef.current;
      if (prev.w === size.w && prev.h === size.h) return;
      hostSizeRef.current = size;
      el.setAttribute("data-nx-chart-w", String(size.w));
      el.setAttribute("data-nx-chart-h", String(size.h));
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [config.presetId]);

  useEffect(() => {
    if (!needsHistory) {
      setPoints([]);
      setError(null);
      return;
    }
    if (!capabilityId) {
      setPoints([]);
      setError("No capability bound");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .history(capabilityId, range)
      .then((res) => {
        if (cancelled) return;
        setPoints(res.points);
        if (res.points.length === 0) {
          setError("No history data for this range yet");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPoints([]);
        setError(err instanceof Error ? err.message : "History load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsHistory, capabilityId, range]);

  const { min, max } = resolveMinMax(config, cap);
  const live = liveValue(cap);
  const chartName = dataLabel.trim() || tileTitle || "";
  const resolvedScalePx = scalePx ?? 220;
  const ctx: EchartsBuildCtx = useMemo(() => {
    const base: EchartsBuildCtx = {
      value: live ?? 0,
      unit: cap?.unit ?? "",
      title: chartName,
      kind: cap?.kind ?? "",
      min,
      max,
      accent: config.accent,
      palette: chartPalette,
      points,
      range,
      sizePx: resolvedScalePx,
    };
    if (preset.family === "gauge") {
      const nice = niceGaugeAxis(base, 8);
      return { ...base, min: nice.min, max: nice.max, splitNumber: nice.splitNumber };
    }
    return base;
  }, [cap, chartName, min, max, config.accent, chartPalette, points, range, resolvedScalePx, preset.family, live]);

  const option = useMemo(() => {
    try {
      const built = preset.buildOption(ctx);
      const gauged =
        preset.family === "gauge" ? enforceAllGaugeSeries(built, ctx) : built;
      const merged = buildFinalOption(gauged, config.optionOverride);
      return applyEchartsPalette(applySafeChartTooltip(merged), chartPalette);
    } catch (err) {
      console.error("ECharts option build failed", err);
      return {
        title: { text: "Chart error", left: "center", top: "center" },
      };
    }
  }, [preset, ctx, config.optionOverride, chartPalette]);

  if (preset.needsCapability && !capabilityId && preset.dataMode !== "none") {
    return (
      <Typography variant="body2" color="text.secondary">
        No capability bound
      </Typography>
    );
  }

  if (preset.needsCapability && capabilityId && !cap) {
    return (
      <Typography variant="body2" color="text.secondary">
        Capability missing — edit widget and re-select
      </Typography>
    );
  }

  if (needsHistory && loading && points.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading history…
      </Typography>
    );
  }

  if (needsHistory && error && points.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {error}
      </Typography>
    );
  }

  const renderer = needsHistory || preset.family === "heatmap" ? "canvas" : "svg";
  const chartReady = scalePx !== null;

  return (
    <Box
      ref={hostRef}
      data-nx-chart-host
      data-nx-chart-preset={config.presetId}
      sx={{
        position: "relative",
        flex: 1,
        alignSelf: "stretch",
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {needsHistory && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ position: "absolute", top: 0, right: 4, zIndex: 1 }}
        >
          {range}
          {error ? ` · ${error}` : ""}
        </Typography>
      )}
      {chartReady && (
        <ReactECharts
          key={config.presetId}
          option={option}
          style={{ width: "100%", height: "100%", display: "block" }}
          opts={{ renderer }}
          notMerge={!isGauge}
          onChartReady={(chart) => {
            chartRef.current = chart;
            const el = hostRef.current;
            if (!el) return;
            const size = measureHost(el);
            if (size) {
              chart.resize({ width: size.w, height: size.h });
            }
          }}
        />
      )}
    </Box>
  );
}
