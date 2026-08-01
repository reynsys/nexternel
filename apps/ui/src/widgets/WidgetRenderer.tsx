import { useEffect, useState } from "react";
import { Box, Paper, Stack, Switch, Typography } from "@mui/material";
import type { Capability } from "../api";
import { api, type WidgetInstance } from "../api";
import { getWidgetContribution } from "../plugins/registry";
import {
  capabilityLocationLabel,
} from "../lib/capability-labels";
import { resolveWidgetTitle } from "../lib/widget-title";
import { contentSurfaceSx } from "../skins/surfaceStyles";
import { useGradientActive, useSolidContentPanels } from "../skins/useSurfaceStyles";
import { EChartsWidgetBody, isEchartsWidgetType, migrateWidgetToEcharts } from "./echarts";
import { GeneralWidgetBody, isGeneralWidgetType } from "./general";

function capabilityIdOf(widget: WidgetInstance): string | null {
  const id = widget.bindings.capabilityId;
  return typeof id === "string" ? id : null;
}

function findCap(caps: Capability[], widget: WidgetInstance): Capability | undefined {
  const id = capabilityIdOf(widget);
  if (id) {
    const byId = caps.find((c) => c.id === id);
    if (byId) return byId;
  }
  const sourceId = widget.bindings.sourceId;
  const sourceType = widget.bindings.sourceType;
  if (typeof sourceId === "string" && sourceId) {
    const bySource = caps.find(
      (c) =>
        c.sourceId === sourceId &&
        (typeof sourceType !== "string" || !sourceType || c.sourceType === sourceType)
    );
    if (bySource) return bySource;
  }
  const title = widget.title?.trim().toLowerCase();
  if (title) {
    const named = caps.filter((c) => c.name.trim().toLowerCase() === title);
    if (named.length === 1) return named[0];
    if (
      (title.includes("meter") || title.includes("gauge")) &&
      title.includes("energy") &&
      !title.includes("daily")
    ) {
      const power = caps.filter((c) => c.kind === "power");
      if (power.length === 1) return power[0];
    }
    const partial = caps.filter(
      (c) =>
        title.includes(c.name.trim().toLowerCase()) ||
        c.name.trim().toLowerCase().includes(title)
    );
    if (partial.length === 1) return partial[0];
    if (title.includes("power")) {
      const power = caps.filter((c) => c.kind === "power");
      if (power.length === 1) return power[0];
    }
    if (title.includes("energy") || title.includes("daily")) {
      const energy = caps.filter((c) => c.kind === "energy");
      if (energy.length === 1) return energy[0];
    }
  }
  return undefined;
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
  widget: rawWidget,
  capabilities,
  editMode,
  chrome = true,
  onCapabilityState,
}: {
  widget: WidgetInstance;
  capabilities: Capability[];
  editMode: boolean;
  /** When false, parent supplies the card chrome (edit grid). */
  chrome?: boolean;
  /** Apply command/live updates into parent capability state (survives dead WS). */
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
}) {
  const widget = isEchartsWidgetType(rawWidget.type)
    ? migrateWidgetToEcharts(rawWidget)
    : rawWidget;
  const gradientActive = useGradientActive();
  const solidContentPanels = useSolidContentPanels();
  const cap = findCap(capabilities, widget);
  const title = resolveWidgetTitle(widget, cap);
  const location = cap ? capabilityLocationLabel(cap) : "";
  const plugin = getWidgetContribution(rawWidget.type);
  const PluginComponent = plugin?.Component;
  const isClock = rawWidget.type === "plugin.clock";
  const isGeneral = isGeneralWidgetType(widget.type);
  const showHeader =
    !isClock &&
    !isGeneral &&
    (chrome
      ? Boolean(title) ||
        widget.type === "switch" ||
        widget.type === "stat" ||
        Boolean(cap)
      : Boolean(title) || widget.type === "switch" || widget.type === "stat");

  const body = (
    <>
      {showHeader && (
        <Stack spacing={0} sx={{ mb: 0.5, flexShrink: 0, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            noWrap
            title={title}
            sx={{
              fontWeight: 600,
              opacity: chrome ? 1 : 0.95,
              lineHeight: 1.2,
              fontSize: "0.85rem",
            }}
          >
            {title}
          </Typography>
          {Boolean(location) && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={location}
              sx={{ lineHeight: 1.2 }}
            >
              {location}
            </Typography>
          )}
        </Stack>
      )}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {PluginComponent ? (
          <PluginComponent widget={widget} capabilities={capabilities} editMode={editMode} />
        ) : isGeneralWidgetType(widget.type) ? (
          <GeneralWidgetBody widget={widget} />
        ) : widget.type === "switch" ? (
          <SwitchWidgetBody
            cap={cap}
            disabled={editMode}
            onCapabilityState={onCapabilityState}
          />
        ) : isEchartsWidgetType(rawWidget.type) || widget.type === "echarts" ? (
          <EChartsWidgetBody widget={widget} cap={cap} title={title} />
        ) : (
          <StatWidgetBody cap={cap} />
        )}
      </Box>
    </>
  );

  if (!chrome) {
    return (
      <Box
        data-nx-widget={widget.id}
        data-nx-widget-type={widget.type}
        sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {body}
      </Box>
    );
  }

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
        borderRadius: 2,
        ...contentSurfaceSx(gradientActive, solidContentPanels),
      }}
      variant="outlined"
      elevation={0}
    >
      {body}
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
        {cap ? cap.kind : "No capability bound"}
      </Typography>
    </Stack>
  );
}

function SwitchWidgetBody({
  cap,
  disabled,
  onCapabilityState,
}: {
  cap: Capability | undefined;
  disabled: boolean;
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Optimistic override until parent/WS confirms (covers dead live socket). */
  const [pending, setPending] = useState<boolean | null>(null);
  const remoteOn = cap?.state?.value === true;
  const on = pending ?? remoteOn;

  useEffect(() => {
    if (pending !== null && remoteOn === pending) {
      setPending(null);
    }
  }, [pending, remoteOn]);

  async function toggle() {
    if (!cap?.hasCommand || disabled || busy) return;
    const previous = on;
    const next = !previous;
    setBusy(true);
    setError(null);
    setPending(next);
    onCapabilityState?.(cap.id, next, "good", new Date().toISOString());
    try {
      // Explicit on/off from what the user sees — not server-side toggle of a possibly stale cache.
      const res = await api.command(cap.id, next ? "on" : "off");
      const value = res.value;
      setPending(value);
      onCapabilityState?.(cap.id, value, "good", new Date().toISOString());
    } catch (err) {
      setPending(null);
      onCapabilityState?.(
        cap.id,
        previous,
        cap.state?.quality ?? "unknown",
        cap.state?.updatedAt ?? new Date().toISOString()
      );
      setError(err instanceof Error ? err.message : "Command failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack height="100%" justifyContent="center" spacing={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" color={on ? "success.main" : "text.secondary"}>
          {cap ? (on ? "ON" : "OFF") : "—"}
        </Typography>
        <Switch
          checked={on}
          disabled={disabled || busy || !cap?.hasCommand}
          onChange={() => void toggle()}
          inputProps={{
            "aria-label": cap
              ? `Toggle ${cap.name} on ${cap.deviceName}`
              : "Toggle switch",
          }}
        />
      </Stack>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
