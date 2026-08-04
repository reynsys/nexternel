import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { Capability, WidgetInstance } from "../../api";
import { gradientCss } from "../../skins/gradientPalettes";
import { metricTileSurfaceSx } from "../../skins/surfaceStyles";
import { useSkin } from "../../skins/SkinProvider";
import { echartsPaletteFromTheme } from "../echarts/chart-theme";
import {
  aqiBandPillStyle,
  aqiFromPm25,
  aqiLabel,
  IconAqi,
  IconHumidity,
  IconPm,
  IconTemperature,
} from "@nexternel/plugin-air-quality";

const MEASURE_HOLD_MS = 22000;

function slotId(bindings: Record<string, unknown> | undefined, key: string): string | undefined {
  const slots = bindings?.slots;
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return undefined;
  const id = (slots as Record<string, string>)[key];
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

function findCap(caps: Capability[], id: string | undefined): Capability | undefined {
  if (!id) return undefined;
  return caps.find((c) => c.id === id);
}

function readingParts(cap: Capability | undefined): { value: string; unit: string } {
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

function numericValue(cap: Capability | undefined): number | null {
  if (!cap?.state) return null;
  if (cap.state.quality === "stale" || cap.state.quality === "unknown") return null;
  const v = cap.state.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function switchIsOn(cap: Capability | undefined): boolean {
  if (!cap?.state) return false;
  const v = cap.state.value;
  return v === true || v === "ON" || v === "on";
}

function MetricTile({
  label,
  icon,
  cap,
  tileSx,
  labelColor,
  valueColor,
  unitColor,
}: {
  label: string;
  icon: ReactNode;
  cap: Capability | undefined;
  tileSx: Record<string, unknown>;
  labelColor: string;
  valueColor: string;
  unitColor: string;
}) {
  const { value, unit } = readingParts(cap);
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 0.75,
        ...tileSx,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={0.5}
        sx={{ mb: 0.75, color: labelColor }}
      >
        {icon}
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ fontSize: "0.68rem", lineHeight: 1.2, color: labelColor }}
        >
          {label}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="center"
        spacing={0.5}
        sx={{ width: "100%" }}
      >
        <Typography
          component="div"
          sx={{
            fontSize: "clamp(1.15rem, 4.5vw, 1.65rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            color: valueColor,
          }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            component="span"
            sx={{
              fontSize: "clamp(0.8rem, 2.8vw, 0.95rem)",
              fontWeight: 700,
              color: unitColor,
              lineHeight: 1.1,
              flexShrink: 0,
            }}
          >
            {unit}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export function AirQualityWidget({
  widget,
  capabilities = [],
  editMode = false,
  onCapabilityCommand,
}: {
  widget?: WidgetInstance;
  capabilities?: Capability[];
  editMode?: boolean;
  onCapabilityCommand?: (
    capabilityId: string,
    action: "on" | "off"
  ) => Promise<{ value: unknown } | void>;
}) {
  const theme = useTheme();
  const { themePrefs } = useSkin();
  const palette = echartsPaletteFromTheme(theme);
  const gradientActive = Boolean(gradientCss(themePrefs.gradientId));
  const solidContentPanels = Boolean(themePrefs.solidContentPanels);
  const tileSx = useMemo(
    () => metricTileSurfaceSx(theme, gradientActive, solidContentPanels),
    [theme, gradientActive, solidContentPanels]
  );

  const bindings = widget?.bindings;
  const pm1 = findCap(capabilities, slotId(bindings, "pm1"));
  const pm25 = findCap(capabilities, slotId(bindings, "pm25"));
  const pm10 = findCap(capabilities, slotId(bindings, "pm10"));
  const temperature = findCap(capabilities, slotId(bindings, "temperature"));
  const humidity = findCap(capabilities, slotId(bindings, "humidity"));
  const measure = findCap(capabilities, slotId(bindings, "measure"));

  const pm25Val = numericValue(pm25);
  const aqi = useMemo(() => (pm25Val != null ? aqiFromPm25(pm25Val) : null), [pm25Val]);
  const bandPill = aqi != null ? aqiBandPillStyle(aqi) : null;

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
    <Box
      sx={{
        height: "100%",
        width: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        gap: 1,
        color: palette.textPrimary,
      }}
    >
      <Stack
        sx={{
          flex: 1,
          minHeight: 0,
          justifyContent: "center",
          gap: 1.5,
          py: 0.5,
        }}
      >
        {aqi != null && bandPill && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1.25}
            sx={{ flexShrink: 0 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ color: palette.textSecondary }}
            >
              <IconAqi size={14} />
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ fontSize: "0.68rem", color: palette.textSecondary }}
              >
                AQI (PM2.5)
              </Typography>
            </Stack>
            <Typography
              component="div"
              sx={{
                fontSize: "clamp(1.15rem, 4.5vw, 1.65rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: palette.accent,
              }}
            >
              {aqi}
            </Typography>
            <Box
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: bandPill.text,
                px: 1.25,
                py: 0.5,
                borderRadius: 1.5,
                border: `1px solid ${bandPill.border}`,
                bgcolor: bandPill.background,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {aqiLabel(aqi)}
            </Box>
          </Stack>
        )}
        <Stack direction="row" spacing={0.75} sx={{ minHeight: 0 }}>
          <MetricTile
            label="PM1.0"
            icon={<IconPm />}
            cap={pm1}
            tileSx={tileSx}
            labelColor={palette.textSecondary}
            valueColor={palette.accent}
            unitColor={palette.textSecondary}
          />
          <MetricTile
            label="PM2.5"
            icon={<IconPm />}
            cap={pm25}
            tileSx={tileSx}
            labelColor={palette.textSecondary}
            valueColor={palette.accent}
            unitColor={palette.textSecondary}
          />
          <MetricTile
            label="PM10"
            icon={<IconPm />}
            cap={pm10}
            tileSx={tileSx}
            labelColor={palette.textSecondary}
            valueColor={palette.accent}
            unitColor={palette.textSecondary}
          />
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ minHeight: 0 }}>
          <MetricTile
            label="Temperature"
            icon={<IconTemperature />}
            cap={temperature}
            tileSx={tileSx}
            labelColor={palette.textSecondary}
            valueColor={palette.accent}
            unitColor={palette.textSecondary}
          />
          <MetricTile
            label="Humidity"
            icon={<IconHumidity />}
            cap={humidity}
            tileSx={tileSx}
            labelColor={palette.textSecondary}
            valueColor={palette.accent}
            unitColor={palette.textSecondary}
          />
        </Stack>
      </Stack>

      <Button
        variant={isMeasuring ? "contained" : "outlined"}
        color="primary"
        fullWidth
        disabled={
          editMode || cmdBusy || isMeasuring || !measure?.hasCommand || !onCapabilityCommand
        }
        onClick={() => void measureNow()}
        sx={{
          flexShrink: 0,
          fontWeight: 700,
          fontSize: "0.8rem",
          py: 1.1,
          opacity: editMode ? 0.5 : 1,
        }}
      >
        {buttonLabel}
      </Button>
      {cmdError && (
        <Typography variant="caption" color="error" sx={{ flexShrink: 0 }}>
          {cmdError}
        </Typography>
      )}
    </Box>
  );
}
