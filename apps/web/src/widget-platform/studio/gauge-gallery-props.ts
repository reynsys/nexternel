"use client";

import type { GaugeComponentProps } from "react-gauge-component";
import type { GaugeGalleryPresetMeta } from "@/widget-platform/definitions/gauge/gauge-gallery-catalog";
import { GAUGE_GALLERY_CATALOG } from "@/widget-platform/definitions/gauge/gauge-gallery-catalog";
import { GAUGE_MARGINS_BY_TYPE } from "@/widget-platform/gauge-cell-layout";
import { prepareGalleryArc, clampGaugeValue } from "@/widget-platform/definitions/gauge/gauge-arc-sanitize";
import type { GaugeTypeId } from "@/widget-platform/types";

function formatKbits(v: number): string {
  if (v >= 1000) {
    const m = v / 1000;
    return Number.isInteger(m) ? `${m.toFixed(0)} mbit/s` : `${m.toFixed(1)} mbit/s`;
  }
  return `${v.toFixed(0)} kbit/s`;
}

const UV_LABELS = [
  "Low",
  "Low",
  "Low",
  "Moderate",
  "Moderate",
  "Moderate",
  "High",
  "High",
  "Very High",
  "Very High",
  "Extreme",
  "Extreme",
];

function compassLabel(v: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${Math.round(v)}° ${dirs[Math.round(v / 45) % 8]}`;
}

function fuelLabel(v: number): string {
  return v <= 25 ? "LOW" : "OK";
}

/** Faithful react-gauge-component gallery props (custom formatters + ticks). */
export function buildGalleryGaugeProps(
  preset: GaugeGalleryPresetMeta,
  value: number
): GaugeComponentProps {
  const { design, defaultMin, defaultMax } = preset;
  const gaugeType = (design.gaugeType ?? "semicircle") as GaugeTypeId;
  const minValue = design.minValue ?? defaultMin;
  const maxValue = design.maxValue ?? defaultMax;
  const safeValue = clampGaugeValue(value, minValue, maxValue);

  // Published @types lag behind runtime; cast like build-props.ts.
  const base = {
    value: safeValue,
    type: gaugeType,
    minValue,
    maxValue,
    startAngle: design.startAngle,
    endAngle: design.endAngle,
    marginInPercent: GAUGE_MARGINS_BY_TYPE[gaugeType],
    style: { width: "100%", height: "100%" },
    arc: prepareGalleryArc(design.arc, minValue, maxValue),
    pointer: design.pointers?.length ? undefined : design.pointer,
    pointers: design.pointers?.length ? design.pointers : undefined,
  } as GaugeComponentProps;

  const withLabels = (labels: unknown): GaugeComponentProps =>
    ({ ...base, labels }) as GaugeComponentProps;

  switch (preset.id) {
    case "server-temperature":
      return withLabels({
        valueLabel: {
          formatTextValue: (v: number) => `${v.toFixed(1)}°C`,
          style: { fontSize: "20px", fill: "#e0e0e0", fontWeight: "bold" },
        },
        tickLabels: {
          type: "outer",
          defaultTickValueConfig: {
            formatTextValue: (v: number) => `${v}°`,
            style: { fontSize: "9px", fill: "#aaa" },
          },
          defaultTickLineConfig: { color: "#666", length: 4, width: 1 },
        },
      });
    case "network-speed":
      return withLabels({
          valueLabel: {
            style: { fontSize: 40 },
            formatTextValue: formatKbits,
            offsetY: -20,
          },
          tickLabels: {
            type: "outer",
            ticks: [
              { value: 100 },
              { value: 200 },
              { value: 300 },
              { value: 400 },
              { value: 500 },
              { value: 600 },
              { value: 700 },
              { value: 800 },
              { value: 900 },
              { value: 1000 },
              { value: 1500 },
              { value: 2000 },
              { value: 2500 },
              { value: 3000 },
            ],
            defaultTickValueConfig: {
              formatTextValue: formatKbits,
              style: { fontSize: 10 },
            },
          },
      });
    case "green-speedometer":
      return withLabels({
          valueLabel: {
            formatTextValue: (v: number) => `${Math.round(v)} km/h`,
            style: {
              fontSize: "18px",
              fill: "#00ff41",
              fontWeight: "bold",
              textShadow: "0 0 10px #00ff41",
            },
          },
          tickLabels: {
            type: "outer",
            ticks: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180].map((v: number) => ({ value: v })),
            defaultTickValueConfig: {
              formatTextValue: (v: number) => `${v} km/h`,
              style: { fontSize: "8px", fill: "#00ff41" },
            },
            defaultTickLineConfig: { color: "#00ff41", length: 8, width: 2 },
          },
      });
    case "battery":
      return withLabels({
          valueLabel: {
            formatTextValue: (v: number) => `${v}%`,
            matchColorWithArc: true,
            style: { fontWeight: "bold" },
          },
          tickLabels: {
            type: "outer",
            defaultTickValueConfig: { style: { fontSize: "9px", fill: "#aaa" } },
          },
      });
    case "fuel-gauge":
      return withLabels({
          valueLabel: {
            formatTextValue: fuelLabel,
            style: { fontSize: "22px", fill: "#e0e0e0", fontWeight: "bold" },
          },
          tickLabels: {
            type: "outer",
            ticks: [
              {
                value: 0,
                valueConfig: {
                  formatTextValue: () => "E",
                  style: { fontSize: "12px", fill: "#EA4228", fontWeight: "bold" },
                },
              },
              {
                value: 50,
                valueConfig: {
                  formatTextValue: () => "½",
                  style: { fontSize: "10px", fill: "#aaa" },
                },
              },
              {
                value: 100,
                valueConfig: {
                  formatTextValue: () => "F",
                  style: { fontSize: "12px", fill: "#5BE12C", fontWeight: "bold" },
                },
              },
            ],
            defaultTickLineConfig: { color: "#666", length: 6, width: 2 },
          },
      });
    case "frost-crystal":
      return withLabels({
          valueLabel: {
            style: { fontSize: "26px", fill: "#e0f7fa", fontWeight: "300" },
          },
          tickLabels: { hideMinMax: true },
      });
    case "uv-index":
      return withLabels({
          valueLabel: {
            formatTextValue: (v: number) => UV_LABELS[Math.min(Math.round(v), 11)] ?? "Low",
            matchColorWithArc: true,
            style: { fontSize: "20px", fontWeight: "bold" },
          },
          tickLabels: {
            type: "outer",
            ticks: [{ value: 0 }, { value: 3 }, { value: 6 }, { value: 8 }, { value: 11 }],
            defaultTickValueConfig: { style: { fontSize: "10px", fill: "#aaa" } },
            defaultTickLineConfig: { color: "#666", length: 5, width: 1 },
          },
      });
    case "sound-level":
      return withLabels({
          valueLabel: {
            formatTextValue: (v: number) => `${Math.round(v)} dB`,
            style: { fontSize: "22px", fill: "#fff", fontWeight: "bold" },
          },
          tickLabels: {
            type: "outer",
            ticks: [
              { value: 0, valueConfig: { formatTextValue: () => "0", style: { fontSize: "9px", fill: "#00c853" } } },
              { value: 40, valueConfig: { formatTextValue: () => "40", style: { fontSize: "9px", fill: "#76ff03" } } },
              { value: 70, valueConfig: { formatTextValue: () => "70", style: { fontSize: "9px", fill: "#ffea00" } } },
              { value: 85, valueConfig: { formatTextValue: () => "85", style: { fontSize: "9px", fill: "#ff9100" } } },
              { value: 120, valueConfig: { formatTextValue: () => "120", style: { fontSize: "9px", fill: "#dd2c00" } } },
            ],
            defaultTickLineConfig: { color: "#444", length: 4, width: 1 },
          },
      });
    case "compass-bearing":
      return withLabels({
          valueLabel: {
            formatTextValue: compassLabel,
            style: { fontSize: "18px", fill: "#fff", fontWeight: "bold" },
          },
          tickLabels: {
            type: "outer",
            hideMinMax: true,
            ticks: [
              {
                value: 0,
                valueConfig: {
                  formatTextValue: () => "N",
                  style: { fontSize: "12px", fill: "#e74c3c", fontWeight: "bold" },
                },
              },
              { value: 90, valueConfig: { formatTextValue: () => "E", style: { fontSize: "10px", fill: "#aaa" } } },
              { value: 180, valueConfig: { formatTextValue: () => "S", style: { fontSize: "10px", fill: "#aaa" } } },
              { value: 270, valueConfig: { formatTextValue: () => "W", style: { fontSize: "10px", fill: "#aaa" } } },
            ],
            defaultTickLineConfig: { color: "#555", length: 4, width: 1 },
          },
      });
    case "humidity-meter":
      return withLabels({
          valueLabel: {
            formatTextValue: (v: number) => `${Math.round(v)}% RH`,
            style: { fontSize: "22px", fill: "#4fc3f7", fontWeight: "bold" },
          },
          tickLabels: {
            type: "outer",
            ticks: [{ value: 0 }, { value: 30 }, { value: 60 }, { value: 100 }],
            defaultTickValueConfig: {
              formatTextValue: (v: number) => `${v}%`,
              style: { fontSize: "9px", fill: "#aaa" },
            },
          },
      });
    case "custom-angle":
      return withLabels({
          valueLabel: {
            formatTextValue: (v: number) => `${(v / 1000).toFixed(1)}k`,
            matchColorWithArc: true,
            style: { fontSize: "29px", fontWeight: "bold" },
            offsetY: -6,
          },
          tickLabels: {
            type: "outer",
            hideMinMax: false,
            ticks: [{ value: 0 }, { value: 3000 }, { value: 2000 }],
          },
      });
    case "radial-elastic":
      return withLabels({
          valueLabel: {
            style: { fontSize: "36px", fill: "#e0e0e0", fontWeight: "bold" },
          },
          tickLabels: {
            type: "inner",
            ticks: [{ value: 20 }, { value: 40 }, { value: 60 }, { value: 80 }, { value: 100 }],
            defaultTickValueConfig: { style: { fontSize: "11px", fill: "#bbb" } },
            defaultTickLineConfig: { distanceFromArc: 3, distanceFromText: 12 },
          },
      });
    case "warm-glow":
      return withLabels({
        valueLabel: {
          formatTextValue: (v: number) => v.toFixed(2),
          matchColorWithArc: true,
          style: { fontSize: "40px", fontWeight: "bold" },
        },
        tickLabels: {
          type: "outer",
          ticks: [{ value: 0 }, { value: 0.5 }, { value: 1 }],
          defaultTickValueConfig: {
            formatTextValue: (v: number) => String(v),
            style: { fontSize: "9px", fill: "#aaa" },
          },
        },
      });
    default:
      return withLabels({
        valueLabel: design.labels?.valueLabel
          ? {
              matchColorWithArc: design.labels.valueLabel.matchColorWithArc,
              offsetX: design.labels.valueLabel.offsetX,
              offsetY: design.labels.valueLabel.offsetY,
              style: design.labels.valueLabel.fontSize
                ? { fontSize: design.labels.valueLabel.fontSize, fontWeight: "bold" }
                : undefined,
            }
          : undefined,
        tickLabels: design.labels?.tickLabels?.tickValues?.length
          ? {
              type: design.labels.tickLabels.type ?? "outer",
              hideMinMax: design.labels.tickLabels.hideMinMax,
              ticks: design.labels.tickLabels.tickValues.map((v: number) => ({ value: v })),
            }
          : design.labels?.tickLabels?.hideMinMax
            ? { hideMinMax: true }
            : undefined,
      });
  }
}

export function galleryPresetMidpoint(preset: GaugeGalleryPresetMeta): number {
  return (preset.defaultMin + preset.defaultMax) / 2;
}

export function getGalleryPreset(id: string): GaugeGalleryPresetMeta | undefined {
  return GAUGE_GALLERY_CATALOG.find((p) => p.id === id);
}

export const GALLERY_GRID_HEIGHTS: Record<1 | 2 | 3 | 4, string> = {
  1: "450px",
  2: "380px",
  3: "320px",
  4: "280px",
};
