import { useEffect, useMemo, useRef, useState } from "react";
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
import { enforceAllGaugeSeries, niceGaugeAxis } from "./gauge-scale";
import { getEchartsPreset } from "./registry";
import type { EchartsBuildCtx, HistoryPoint } from "./types";

function capabilityIdOf(widget: WidgetInstance): string | null {
  const id = primaryCapabilityId(widget.bindings);
  return id ?? null;
}

export function EChartsWidgetBody({
  widget,
  cap,
  title,
  layoutEpoch = 0,
}: {
  widget: WidgetInstance;
  cap: Capability | undefined;
  title: string;
  /** Bumps when dashboard edit chrome changes so charts remeasure. */
  layoutEpoch?: number;
}) {
  const config = parseEchartsConfig(widget.config);
  const preset = getEchartsPreset(config.presetId);
  const theme = useTheme();
  const chartPalette = useMemo(() => echartsPaletteFromTheme(theme), [theme]);
  const range: HistoryRange = config.range ?? "24h";
  const capabilityId = capabilityIdOf(widget);
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsHistory = preset.dataMode === "history";
  /** Match ECharts gauge radius (% of min(width,height)) — never use max(w,h) for stroke scale. */
  const sizePx = box.w > 0 && box.h > 0 ? Math.min(box.w, box.h) : 220;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.floor(r.width));
      const h = Math.max(0, Math.floor(r.height));
      if (w > 0 && h > 0) {
        setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
        chartRef.current?.resize({ width: w, height: h });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let cancelled = false;
    const settle = () => {
      if (!cancelled) measure();
    };
    requestAnimationFrame(() => requestAnimationFrame(settle));
    const t = window.setTimeout(settle, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [config.presetId, layoutEpoch]);

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
  const ctx: EchartsBuildCtx = useMemo(() => {
    const base: EchartsBuildCtx = {
      value: live ?? 0,
      unit: cap?.unit ?? "",
      title,
      kind: cap?.kind ?? "",
      min,
      max,
      accent: config.accent,
      palette: chartPalette,
      points,
      range,
      sizePx,
    };
    if (preset.family === "gauge") {
      const nice = niceGaugeAxis(base, 8);
      return { ...base, min: nice.min, max: nice.max, splitNumber: nice.splitNumber };
    }
    return base;
  }, [cap, title, min, max, config.accent, chartPalette, points, range, sizePx, preset.family, live]);

  const option = useMemo(() => {
    try {
      const built = preset.buildOption(ctx);
      const gauged =
        preset.family === "gauge" ? enforceAllGaugeSeries(built, ctx) : built;
      const merged = buildFinalOption(gauged, config.optionOverride);
      return applyEchartsPalette(merged, chartPalette);
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
  const ready = box.w > 0 && box.h > 0;

  return (
    <Box
      ref={hostRef}
      data-nx-chart-host
      sx={{
        position: "relative",
        flex: 1,
        alignSelf: "stretch",
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
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
      {ready && (
        <ReactECharts
          key={config.presetId}
          option={option}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          opts={{ renderer }}
          notMerge
          onChartReady={(chart) => {
            chartRef.current = chart;
            const r = hostRef.current?.getBoundingClientRect();
            if (r && r.width > 0 && r.height > 0) {
              chart.resize({ width: Math.floor(r.width), height: Math.floor(r.height) });
            }
          }}
        />
      )}
    </Box>
  );
}
