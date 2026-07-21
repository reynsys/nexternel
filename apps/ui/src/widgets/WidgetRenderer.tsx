import { useEffect, useState } from "react";
import { Box, Paper, Stack, Switch, Typography } from "@mui/material";
import ReactECharts from "echarts-for-react";
import type { Capability } from "../api";
import { api, type HistoryRange, type WidgetInstance } from "../api";
import { getWidgetContribution } from "../plugins/registry";

function capabilityIdOf(widget: WidgetInstance): string | null {
  const id = widget.bindings.capabilityId;
  return typeof id === "string" ? id : null;
}

function findCap(caps: Capability[], widget: WidgetInstance): Capability | undefined {
  const id = capabilityIdOf(widget);
  return id ? caps.find((c) => c.id === id) : undefined;
}

function historyRangeOf(widget: WidgetInstance): HistoryRange {
  const r = widget.config.range;
  if (r === "1h" || r === "6h" || r === "24h" || r === "7d") return r;
  return "24h";
}

function formatValue(cap: Capability | undefined): string {
  if (!cap?.state) return "—";
  const v = cap.state.value;
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (typeof v === "number") {
    const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
    return cap.unit ? `${n} ${cap.unit}` : n;
  }
  return String(v);
}

export function WidgetRenderer({
  widget,
  capabilities,
  editMode,
}: {
  widget: WidgetInstance;
  capabilities: Capability[];
  editMode: boolean;
}) {
  const cap = findCap(capabilities, widget);
  const title = widget.title || cap?.name || widget.type;
  const plugin = getWidgetContribution(widget.type);
  const PluginComponent = plugin?.Component;

  return (
    <Paper
      data-nx-widget={widget.id}
      data-nx-widget-type={widget.type}
      sx={{
        height: "100%",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
      variant="outlined"
    >
      <Typography variant="subtitle2" noWrap sx={{ mb: 0.5, opacity: 0.85 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {PluginComponent ? (
          <PluginComponent widget={widget} capabilities={capabilities} editMode={editMode} />
        ) : widget.type === "switch" ? (
          <SwitchWidgetBody cap={cap} disabled={editMode} />
        ) : widget.type === "gauge" ? (
          <GaugeWidgetBody cap={cap} />
        ) : widget.type === "history" ? (
          <HistoryWidgetBody
            capabilityId={capabilityIdOf(widget)}
            range={historyRangeOf(widget)}
            unit={cap?.unit ?? null}
            title={title}
          />
        ) : (
          <StatWidgetBody cap={cap} />
        )}
      </Box>
    </Paper>
  );
}

function StatWidgetBody({ cap }: { cap: Capability | undefined }) {
  return (
    <Stack height="100%" justifyContent="center">
      <Typography variant="h4" component="div">
        {formatValue(cap)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {cap ? `${cap.deviceName} · ${cap.kind}` : "No capability bound"}
      </Typography>
    </Stack>
  );
}

function SwitchWidgetBody({
  cap,
  disabled,
}: {
  cap: Capability | undefined;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const on = cap?.state?.value === true;

  async function toggle() {
    if (!cap?.hasCommand || disabled) return;
    setBusy(true);
    try {
      await api.command(cap.id, "toggle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack height="100%" direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="h6">{on ? "ON" : "OFF"}</Typography>
      <Switch
        checked={on}
        disabled={disabled || busy || !cap?.hasCommand}
        onChange={() => void toggle()}
      />
    </Stack>
  );
}

function GaugeWidgetBody({ cap }: { cap: Capability | undefined }) {
  const value = typeof cap?.state?.value === "number" ? cap.state.value : 0;
  const max =
    typeof cap?.state?.value === "number" && cap.state.value > 100
      ? Math.ceil(cap.state.value / 10) * 10
      : 100;

  const option = {
    series: [
      {
        type: "gauge",
        min: 0,
        max,
        progress: { show: true, width: 12 },
        axisLine: { lineStyle: { width: 12 } },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { width: 1 } },
        axisLabel: { distance: 12, fontSize: 10 },
        pointer: { length: "55%", width: 4 },
        anchor: { show: true, size: 10 },
        detail: {
          valueAnimation: true,
          fontSize: 16,
          formatter: (v: number) =>
            `${Number.isInteger(v) ? v : v.toFixed(1)}${cap?.unit ? ` ${cap.unit}` : ""}`,
        },
        data: [{ value }],
      },
    ],
  };

  return (
    <Box sx={{ height: "100%", minHeight: 120 }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "svg" }}
      />
    </Box>
  );
}

function HistoryWidgetBody({
  capabilityId,
  range,
  unit,
  title,
}: {
  capabilityId: string | null;
  range: HistoryRange;
  unit: string | null;
  title: string;
}) {
  const [points, setPoints] = useState<{ t: string; v: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [capabilityId, range]);

  if (!capabilityId) {
    return (
      <Typography variant="body2" color="text.secondary">
        No capability bound
      </Typography>
    );
  }

  if (loading && points.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading history…
      </Typography>
    );
  }

  if (error && points.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {error}
      </Typography>
    );
  }

  const option = {
    animation: false,
    grid: { left: 36, right: 12, top: 24, bottom: 28 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: {
        fontSize: 10,
        formatter: (v: number) => (unit ? `${v}${unit}` : String(v)),
      },
    },
    series: [
      {
        name: title,
        type: "line",
        showSymbol: false,
        smooth: true,
        data: points.map((p) => [p.t, p.v]),
      },
    ],
  };

  return (
    <Box sx={{ height: "100%", minHeight: 120, position: "relative" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ position: "absolute", top: 0, right: 4, zIndex: 1 }}
      >
        {range}
        {error ? ` · ${error}` : ""}
      </Typography>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge
      />
    </Box>
  );
}
