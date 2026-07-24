import { useState } from "react";
import { Box, Paper, Stack, Switch, Typography } from "@mui/material";
import type { Capability } from "../api";
import { api, type WidgetInstance } from "../api";
import { getWidgetContribution } from "../plugins/registry";
import {
  capabilityLocationLabel,
  defaultWidgetTitle,
} from "../lib/capability-labels";
import { EChartsWidgetBody, isEchartsWidgetType, migrateWidgetToEcharts } from "./echarts";

function capabilityIdOf(widget: WidgetInstance): string | null {
  const id = widget.bindings.capabilityId;
  return typeof id === "string" ? id : null;
}

function findCap(caps: Capability[], widget: WidgetInstance): Capability | undefined {
  const id = capabilityIdOf(widget);
  return id ? caps.find((c) => c.id === id) : undefined;
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
}: {
  widget: WidgetInstance;
  capabilities: Capability[];
  editMode: boolean;
  /** When false, parent supplies the card chrome (edit grid). */
  chrome?: boolean;
}) {
  const widget = isEchartsWidgetType(rawWidget.type)
    ? migrateWidgetToEcharts(rawWidget)
    : rawWidget;
  const cap = findCap(capabilities, widget);
  const rawTitle = widget.title?.trim() ?? "";
  const genericTitle =
    !rawTitle ||
    rawTitle === "Switch" ||
    rawTitle === "Stat" ||
    rawTitle === "Auto" ||
    rawTitle === widget.type;
  const title = genericTitle
    ? defaultWidgetTitle(cap, widget.type === "switch" ? "Switch" : widget.type)
    : rawTitle;
  const plugin = getWidgetContribution(rawWidget.type);
  const PluginComponent = plugin?.Component;
  const isClock = rawWidget.type === "plugin.clock";
  const showHeader =
    !isClock &&
    (chrome ||
      Boolean(title) ||
      widget.type === "switch" ||
      widget.type === "stat" ||
      Boolean(cap));

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
          {(widget.type === "switch" || widget.type === "stat" || cap) && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={capabilityLocationLabel(cap)}
              sx={{ lineHeight: 1.2 }}
            >
              {capabilityLocationLabel(cap)}
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
        ) : widget.type === "switch" ? (
          <SwitchWidgetBody cap={cap} disabled={editMode} />
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
        bgcolor: "background.paper",
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
  );
}
