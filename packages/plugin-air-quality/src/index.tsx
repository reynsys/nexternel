import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { PluginManifest, WidgetBindingSlotDef, WidgetContribution } from "@nexternel/plugin-sdk";
import { aqiBadgeStyle, aqiFromPm25, aqiLabel } from "./aqi";
import { IconAqi, IconHumidity, IconPm, IconTemperature } from "./icons";

export const AIR_QUALITY_WIDGET_TYPE = "plugin.air-quality";

export const AIR_QUALITY_BINDING_SLOTS: WidgetBindingSlotDef[] = [
  {
    key: "pm1",
    label: "PM1.0",
    kinds: ["pm1", "number"],
    nameHints: ["1.0", "pm_1", "pm1", "<1"],
  },
  {
    key: "pm25",
    label: "PM2.5",
    kinds: ["pm25", "number"],
    nameHints: ["2.5", "pm_2", "pm25", "<2.5"],
  },
  {
    key: "pm10",
    label: "PM10",
    kinds: ["pm10", "number"],
    nameHints: ["10.0", "pm_10", "pm10", "<10"],
  },
  {
    key: "temperature",
    label: "Temperature",
    kinds: ["temperature"],
    nameHints: ["temp", "temperature"],
  },
  {
    key: "humidity",
    label: "Humidity",
    kinds: ["humidity"],
    nameHints: ["humid", "humidity"],
  },
  {
    key: "measure",
    label: "Start measuring",
    kinds: ["switch"],
    nameHints: ["measur", "pms", "start"],
    required: true,
  },
];

export const airQualityPluginManifest: PluginManifest = {
  id: "nexternel.air-quality",
  version: "1.0.0",
  pluginApi: 1,
  name: "Air quality",
  description: "PM, temperature, humidity, AQI, and measure control",
  contributes: { widgets: [AIR_QUALITY_WIDGET_TYPE] },
};

type CapabilityLike = {
  id: string;
  kind: string;
  name: string;
  unit?: string | null;
  hasCommand?: boolean;
  state?: {
    value: unknown;
    quality?: string;
    updatedAt?: string;
  } | null;
};

type WidgetLike = {
  id?: string;
  title?: string;
  bindings?: Record<string, unknown>;
};

function slotId(bindings: Record<string, unknown> | undefined, key: string): string | undefined {
  const slots = bindings?.slots;
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return undefined;
  const id = (slots as Record<string, string>)[key];
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

function findCap(caps: CapabilityLike[], id: string | undefined): CapabilityLike | undefined {
  if (!id) return undefined;
  return caps.find((c) => c.id === id);
}

function readingParts(cap: CapabilityLike | undefined): { value: string; unit: string } {
  if (!cap?.state) return { value: "—", unit: "" };
  if (cap.state.quality === "stale" || cap.state.quality === "unknown") {
    return { value: "—", unit: "" };
  }
  const v = cap.state.value;
  if (typeof v === "number") {
    const value = Number.isInteger(v) ? String(v) : v.toFixed(1);
    return { value, unit: cap.unit?.trim() ?? "" };
  }
  return { value: String(v), unit: "" };
}

function numericValue(cap: CapabilityLike | undefined): number | null {
  if (!cap?.state) return null;
  if (cap.state.quality === "stale" || cap.state.quality === "unknown") return null;
  const v = cap.state.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function switchIsOn(cap: CapabilityLike | undefined): boolean {
  if (!cap?.state) return false;
  const v = cap.state.value;
  return v === true || v === "ON" || v === "on";
}

const MEASURE_HOLD_MS = 22000;

function MetricTile({
  label,
  icon,
  cap,
}: {
  label: string;
  icon: ReactNode;
  cap: CapabilityLike | undefined;
}) {
  const { value, unit } = readingParts(cap);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 6px",
        borderRadius: 8,
        background: "rgba(127,127,127,0.08)",
        border: "1px solid rgba(127,127,127,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          marginBottom: 6,
          fontSize: "0.68rem",
          fontWeight: 600,
          opacity: 0.82,
          lineHeight: 1.2,
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 5,
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "clamp(1.15rem, 4.5vw, 1.65rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: "clamp(0.8rem, 2.8vw, 0.95rem)",
              fontWeight: 700,
              opacity: 0.78,
              lineHeight: 1.1,
              flexShrink: 0,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function AirQualityWidget({
  widget,
  capabilities = [],
  editMode = false,
  onCapabilityCommand,
}: {
  widget?: WidgetLike;
  capabilities?: CapabilityLike[];
  editMode?: boolean;
  onCapabilityCommand?: (
    capabilityId: string,
    action: "on" | "off"
  ) => Promise<{ value: unknown } | void>;
}) {
  const bindings = widget?.bindings;
  const pm1 = findCap(capabilities, slotId(bindings, "pm1"));
  const pm25 = findCap(capabilities, slotId(bindings, "pm25"));
  const pm10 = findCap(capabilities, slotId(bindings, "pm10"));
  const temperature = findCap(capabilities, slotId(bindings, "temperature"));
  const humidity = findCap(capabilities, slotId(bindings, "humidity"));
  const measure = findCap(capabilities, slotId(bindings, "measure"));

  const pm25Val = numericValue(pm25);
  const aqi = useMemo(() => (pm25Val != null ? aqiFromPm25(pm25Val) : null), [pm25Val]);
  const aqiStyle = aqi != null ? aqiBadgeStyle(aqi) : null;

  const measureSwitchOn = switchIsOn(measure);
  const [measureUntil, setMeasureUntil] = useState(0);
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdError, setCmdError] = useState<string | null>(null);
  const [, pulse] = useState(0);

  const isMeasuring =
    measureSwitchOn || (measureUntil > 0 && Date.now() < measureUntil);

  useEffect(() => {
    if (!isMeasuring) return;
    const id = window.setInterval(() => pulse((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, [isMeasuring]);

  useEffect(() => {
    if (!measureSwitchOn && measureUntil > 0 && Date.now() >= measureUntil) {
      setMeasureUntil(0);
    }
  }, [measureSwitchOn, measureUntil, capabilities]);

  const title = widget?.title?.trim();
  const showTitle = Boolean(title && title !== "Air quality" && title !== AIR_QUALITY_WIDGET_TYPE);

  async function measureNow() {
    if (!measure?.id || editMode || isMeasuring || cmdBusy || !onCapabilityCommand) return;
    setCmdBusy(true);
    setCmdError(null);
    setMeasureUntil(Date.now() + MEASURE_HOLD_MS);
    try {
      await onCapabilityCommand(measure.id, "on");
    } catch (err) {
      setMeasureUntil(0);
      setCmdError(err instanceof Error ? err.message : "Command failed");
    } finally {
      setCmdBusy(false);
    }
  }

  const buttonLabel = cmdBusy
    ? "Starting…"
    : isMeasuring
      ? "Measuring…"
      : "Measure now";

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        gap: 8,
      }}
    >
      {showTitle && (
        <div
          style={{
            flexShrink: 0,
            fontSize: "0.85rem",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      )}

      {aqi != null && aqiStyle && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${aqiStyle.border}`,
            background: aqiStyle.background,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: aqiStyle.labelColor,
            }}
          >
            <IconAqi size={15} />
            <span>AQI (PM2.5)</span>
          </div>
          <div
            style={{
              fontSize: "clamp(1.35rem, 5vw, 1.85rem)",
              fontWeight: 800,
              lineHeight: 1,
              color: aqiStyle.valueColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {aqi}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: aqiStyle.labelColor,
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${aqiStyle.border}`,
              background: "rgba(255,255,255,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            {aqiLabel(aqi)}
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: 6, minHeight: 0 }}>
          <MetricTile label="PM1.0" icon={<IconPm />} cap={pm1} />
          <MetricTile label="PM2.5" icon={<IconPm />} cap={pm25} />
          <MetricTile label="PM10" icon={<IconPm />} cap={pm10} />
        </div>
        <div style={{ display: "flex", gap: 6, minHeight: 0 }}>
          <MetricTile label="Temperature" icon={<IconTemperature />} cap={temperature} />
          <MetricTile label="Humidity" icon={<IconHumidity />} cap={humidity} />
        </div>
      </div>

      <button
        type="button"
        disabled={
          editMode || cmdBusy || isMeasuring || !measure?.hasCommand || !onCapabilityCommand
        }
        onClick={() => void measureNow()}
        style={{
          flexShrink: 0,
          padding: "9px 12px",
          borderRadius: 8,
          border: isMeasuring
            ? "1px solid rgba(25, 118, 210, 0.65)"
            : "1px solid rgba(25, 118, 210, 0.45)",
          background: isMeasuring
            ? "linear-gradient(180deg, rgba(25,118,210,0.88) 0%, rgba(21,101,192,0.95) 100%)"
            : "rgba(25, 118, 210, 0.14)",
          color: isMeasuring ? "#fff" : "inherit",
          cursor: editMode || isMeasuring || cmdBusy ? "default" : "pointer",
          fontWeight: 700,
          fontSize: "0.8rem",
          opacity: editMode ? 0.5 : 1,
          boxShadow: isMeasuring ? "0 0 0 2px rgba(25,118,210,0.25)" : "none",
          transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {buttonLabel}
      </button>
      {cmdError && (
        <div style={{ fontSize: "0.7rem", color: "#d32f2f", flexShrink: 0 }}>{cmdError}</div>
      )}
    </div>
  );
}

export const airQualityWidgetContribution: WidgetContribution = {
  type: AIR_QUALITY_WIDGET_TYPE,
  label: "Air quality panel",
  category: "sensors",
  needsCapability: false,
  bindingSlots: AIR_QUALITY_BINDING_SLOTS,
  defaultSize: { w: 4, h: 4 },
  Component: AirQualityWidget,
};
