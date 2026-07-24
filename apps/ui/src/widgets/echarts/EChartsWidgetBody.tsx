import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import ReactECharts from "echarts-for-react";
import type { Capability, HistoryRange, WidgetInstance } from "../../api";
import { api } from "../../api";
import {
  liveValue,
  parseEchartsConfig,
  resolveMinMax,
} from "./config";
import { buildFinalOption } from "./merge-option";
import { enforceAllGaugeSeries, niceGaugeAxis } from "./gauge-scale";
import { getEchartsPreset } from "./registry";
import type { EchartsBuildCtx, HistoryPoint } from "./types";

function capabilityIdOf(widget: WidgetInstance): string | null {
  const id = widget.bindings.capabilityId;
  return typeof id === "string" ? id : null;
}

export function EChartsWidgetBody({
  widget,
  cap,
  title,
}: {
  widget: WidgetInstance;
  cap: Capability | undefined;
  title: string;
}) {
  const config = parseEchartsConfig(widget.config);
  const preset = getEchartsPreset(config.presetId);
  const range: HistoryRange = config.range ?? "24h";
  const capabilityId = capabilityIdOf(widget);
  const hostRef = useRef<HTMLDivElement>(null);
  const [sizePx, setSizePx] = useState(220);

  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsHistory = preset.dataMode === "history";

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const shortest = Math.min(r.width, r.height);
      if (shortest > 0) setSizePx(Math.floor(shortest));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
  const ctx: EchartsBuildCtx = useMemo(() => {
    const base: EchartsBuildCtx = {
      value: liveValue(cap),
      unit: cap?.unit ?? "",
      title,
      kind: cap?.kind ?? "",
      min,
      max,
      accent: config.accent,
      points,
      range,
      sizePx,
    };
    // Apply nice axis to ALL gauge presets at the context level
    if (preset.family === "gauge") {
      const nice = niceGaugeAxis(base, 8);
      return { ...base, min: nice.min, max: nice.max, splitNumber: nice.splitNumber };
    }
    return base;
  }, [cap, title, min, max, config.accent, points, range, sizePx, preset.family]);

  const option = useMemo(() => {
    const built = preset.buildOption(ctx);
    const gauged =
      preset.family === "gauge" ? enforceAllGaugeSeries(built, ctx) : built;
    return buildFinalOption(gauged, config.optionOverride);
  }, [preset, ctx, config.optionOverride]);

  if (preset.needsCapability && !capabilityId && preset.dataMode !== "none") {
    return (
      <Typography variant="body2" color="text.secondary">
        No capability bound
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

  return (
    <Box
      ref={hostRef}
      sx={{ height: "100%", minHeight: 140, position: "relative", width: "100%" }}
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
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer }}
        notMerge
      />
    </Box>
  );
}
