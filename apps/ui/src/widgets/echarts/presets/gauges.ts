import type { EchartsBuildCtx, EchartsPreset } from "../types";
import {
  accentOf,
  fmtAxisLabel,
  fmtValue,
  gaugeLayout,
  gs,
  niceGaugeAxis,
} from "../gauge-scale";

const GAUGE_SIZE = { w: 5, h: 5 } as const;

/** Prefer ctx.splitNumber from the shared renderer; fall back to nice axis. */
function axis(ctx: EchartsBuildCtx, preferred = 8) {
  if (
    typeof ctx.splitNumber === "number" &&
    ctx.splitNumber >= 2 &&
    Number.isFinite(ctx.min) &&
    Number.isFinite(ctx.max)
  ) {
    return { min: ctx.min, max: ctx.max, splitNumber: ctx.splitNumber };
  }
  return niceGaugeAxis(ctx, preferred);
}

/**
 * All gauge presets — official ECharts shapes + shared nice ticks / clip-safe layout.
 * The renderer also runs `enforceAllGaugeSeries` so every gauge gets the same axis + clip rules.
 */
export const GAUGE_PRESETS: EchartsPreset[] = [
  {
    id: "gauge",
    label: "Gauge (basic)",
    description: "Official basic dial",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 10);
      const layout = gaugeLayout("full");
      return {
        series: [
          {
            type: "gauge",
            ...layout,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            axisLine: { lineStyle: { width: gs(ctx, 10, 6) } },
            splitLine: { length: gs(ctx, 12, 6), lineStyle: { width: gs(ctx, 2) } },
            axisTick: { length: gs(ctx, 6, 3), lineStyle: { width: 1 } },
            axisLabel: {
              distance: gs(ctx, 14, 8),
              fontSize: gs(ctx, 11, 9),
              color: "#999",
              formatter: fmtAxisLabel,
            },
            pointer: { length: "60%", width: gs(ctx, 5, 3) },
            anchor: { show: true, size: gs(ctx, 12, 6) },
            title: { show: false },
            detail: {
              valueAnimation: true,
              formatter: (v: number) => fmtValue(ctx, v),
              fontSize: gs(ctx, 20, 14),
              offsetCenter: [0, "72%"],
              color: accentOf(ctx),
            },
            data: [{ value: ctx.value, name: "SCORE" }],
            itemStyle: { color: accentOf(ctx) },
          },
        ],
      };
    },
  },
  {
    id: "gauge-simple",
    label: "Gauge (simple)",
    description: "Official simple progress dial",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 10);
      const layout = gaugeLayout("full");
      return {
        series: [
          {
            type: "gauge",
            ...layout,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            progress: { show: true, width: gs(ctx, 12, 8) },
            axisLine: { lineStyle: { width: gs(ctx, 12, 8) } },
            axisTick: { show: false },
            splitLine: { length: gs(ctx, 10, 5), lineStyle: { width: 2, color: "#999" } },
            axisLabel: {
              distance: gs(ctx, 16, 10),
              fontSize: gs(ctx, 11, 9),
              color: "#999",
              formatter: fmtAxisLabel,
            },
            pointer: { length: "55%", width: gs(ctx, 4, 2) },
            anchor: { show: true, size: gs(ctx, 10, 5) },
            title: { show: false },
            detail: {
              valueAnimation: true,
              formatter: (v: number) => fmtValue(ctx, v),
              fontSize: gs(ctx, 20, 14),
              offsetCenter: [0, "72%"],
            },
            data: [{ value: ctx.value, name: "SCORE" }],
            itemStyle: { color: accentOf(ctx) },
          },
        ],
      };
    },
  },
  {
    id: "gauge-speed",
    label: "Speed gauge",
    description: "Official speedometer (semicircle)",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 12);
      const layout = gaugeLayout("semi");
      return {
        series: [
          {
            type: "gauge",
            startAngle: 180,
            endAngle: 0,
            ...layout,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            itemStyle: {
              color: accentOf(ctx, "#58D9F9"),
              shadowColor: "rgba(0,138,255,0.45)",
              shadowBlur: gs(ctx, 10, 4),
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            },
            progress: { show: true, roundCap: true, width: gs(ctx, 18, 10) },
            pointer: {
              icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
              length: "75%",
              width: gs(ctx, 14, 8),
              offsetCenter: [0, "5%"],
            },
            axisLine: { roundCap: true, lineStyle: { width: gs(ctx, 18, 10) } },
            axisTick: { splitNumber: 2, lineStyle: { width: 2, color: "#999" } },
            splitLine: { length: gs(ctx, 12, 6), lineStyle: { width: 3, color: "#999" } },
            axisLabel: {
              distance: gs(ctx, 20, 12),
              color: "#999",
              fontSize: gs(ctx, 12, 9),
              formatter: fmtAxisLabel,
            },
            title: { show: false },
            detail: {
              backgroundColor: "rgba(255,255,255,0.85)",
              borderColor: "#999",
              borderWidth: 1,
              width: "55%",
              lineHeight: gs(ctx, 28, 18),
              height: gs(ctx, 28, 18),
              borderRadius: 8,
              offsetCenter: [0, "35%"],
              valueAnimation: true,
              formatter: (v: number) => fmtValue(ctx, v),
              fontSize: gs(ctx, 20, 13),
              fontWeight: "bolder",
              color: "#555",
            },
            data: [{ value: ctx.value }],
          },
        ],
      };
    },
  },
  {
    id: "gauge-progress",
    label: "Progress gauge",
    description: "Official progress gauge with large value below",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 8);
      const layout = gaugeLayout("full");
      return {
        series: [
          {
            type: "gauge",
            center: ["50%", "48%"],
            radius: layout.radius,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            progress: { show: true, width: gs(ctx, 16, 10) },
            axisLine: { lineStyle: { width: gs(ctx, 16, 10) } },
            axisTick: { show: false },
            splitLine: { length: gs(ctx, 12, 6), lineStyle: { width: 2, color: "#999" } },
            axisLabel: {
              distance: gs(ctx, 16, 10),
              color: "#999",
              fontSize: gs(ctx, 11, 9),
              formatter: fmtAxisLabel,
            },
            anchor: {
              show: true,
              showAbove: true,
              size: gs(ctx, 18, 10),
              itemStyle: { borderWidth: gs(ctx, 6, 3) },
            },
            pointer: { length: "55%", width: gs(ctx, 5, 3) },
            title: { show: false },
            detail: {
              valueAnimation: true,
              fontSize: gs(ctx, 24, 16),
              offsetCenter: [0, "88%"],
              formatter: (v: number) => fmtValue(ctx, v),
              color: accentOf(ctx),
            },
            data: [{ value: ctx.value }],
            itemStyle: { color: accentOf(ctx) },
          },
        ],
      };
    },
  },
  {
    id: "gauge-stage",
    label: "Stage gauge",
    description: "Official stage speed (colored bands)",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 10);
      const layout = gaugeLayout("full");
      const band = gs(ctx, 22, 12);
      return {
        series: [
          {
            type: "gauge",
            ...layout,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            axisLine: {
              lineStyle: {
                width: band,
                color: [
                  [0.3, "#67e0e3"],
                  [0.7, "#37a2da"],
                  [1, "#fd666d"],
                ],
              },
            },
            pointer: { itemStyle: { color: "auto" }, width: gs(ctx, 6, 3) },
            axisTick: {
              distance: -band,
              length: gs(ctx, 8, 4),
              lineStyle: { color: "#fff", width: 2 },
            },
            splitLine: {
              distance: -band,
              length: gs(ctx, 20, 10),
              lineStyle: { color: "#fff", width: 3 },
            },
            axisLabel: {
              color: "inherit",
              distance: gs(ctx, 22, 12),
              fontSize: gs(ctx, 11, 9),
              formatter: fmtAxisLabel,
            },
            detail: {
              valueAnimation: true,
              formatter: (v: number) => fmtValue(ctx, v),
              color: "inherit",
              fontSize: gs(ctx, 20, 14),
              offsetCenter: [0, "72%"],
            },
            data: [{ value: ctx.value }],
          },
        ],
      };
    },
  },
  {
    id: "gauge-grade",
    label: "Grade gauge",
    description: "Official grade / score semicircle",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const span = Math.max(1e-6, ctx.max - ctx.min);
      const norm = Math.min(1, Math.max(0, (ctx.value - ctx.min) / span));
      return {
        series: [
          {
            type: "gauge",
            startAngle: 180,
            endAngle: 0,
            center: ["50%", "75%"],
            radius: "88%",
            min: 0,
            max: 1,
            splitNumber: 8,
            axisLine: {
              lineStyle: {
                width: gs(ctx, 6, 4),
                color: [
                  [0.25, "#FF6E76"],
                  [0.5, "#FDDD60"],
                  [0.75, "#58D9F9"],
                  [1, "#7CFFB2"],
                ],
              },
            },
            pointer: {
              icon: "path://M12.8,0.7l12,40.1H0.7L12.8,0.7z",
              length: "12%",
              width: gs(ctx, 16, 10),
              offsetCenter: [0, "-60%"],
              itemStyle: { color: "auto" },
            },
            axisTick: {
              length: gs(ctx, 10, 5),
              lineStyle: { color: "auto", width: 2 },
            },
            splitLine: {
              length: gs(ctx, 16, 8),
              lineStyle: { color: "auto", width: 3 },
            },
            axisLabel: {
              color: "#464646",
              fontSize: gs(ctx, 11, 8),
              distance: -gs(ctx, 36, 18),
              rotate: "tangential",
              formatter: (value: number) => {
                if (value === 0.875) return "A";
                if (value === 0.625) return "B";
                if (value === 0.375) return "C";
                if (value === 0.125) return "D";
                return "";
              },
            },
            title: { offsetCenter: [0, "-10%"], fontSize: gs(ctx, 12, 9) },
            detail: {
              fontSize: gs(ctx, 22, 14),
              offsetCenter: [0, "-35%"],
              valueAnimation: true,
              formatter: () => fmtValue(ctx, ctx.value),
              color: "inherit",
            },
            data: [{ value: norm, name: ctx.title || "Grade" }],
          },
        ],
      };
    },
  },
  {
    id: "gauge-multi-title",
    label: "Multi-title gauge",
    description: "Official multi-title layout (single live value)",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const pctSpan = Math.max(1e-6, ctx.max - ctx.min);
      const pct = Math.round(((ctx.value - ctx.min) / pctSpan) * 1000) / 10;
      const layout = gaugeLayout("full");
      return {
        series: [
          {
            type: "gauge",
            min: 0,
            max: 100,
            splitNumber: 5,
            ...layout,
            center: ["50%", "45%"],
            anchor: {
              show: true,
              showAbove: true,
              size: gs(ctx, 14, 8),
              itemStyle: { color: "#FAC858" },
            },
            pointer: {
              icon: "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
              width: gs(ctx, 6, 3),
              length: "80%",
              offsetCenter: [0, "8%"],
            },
            progress: { show: true, overlap: true, roundCap: true },
            axisLine: { roundCap: true, lineStyle: { width: gs(ctx, 14, 8) } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            data: [
              {
                value: Math.min(100, Math.max(0, pct)),
                name: ctx.title || "Value",
                title: { offsetCenter: ["0%", "80%"] },
                detail: { offsetCenter: ["0%", "95%"] },
              },
            ],
            title: { fontSize: gs(ctx, 12, 9) },
            detail: {
              width: gs(ctx, 48, 32),
              height: gs(ctx, 16, 12),
              fontSize: gs(ctx, 12, 9),
              color: "#fff",
              backgroundColor: "inherit",
              borderRadius: 3,
              formatter: () => fmtValue(ctx, ctx.value),
            },
            itemStyle: { color: accentOf(ctx) },
          },
        ],
      };
    },
  },
  {
    id: "gauge-temperature",
    label: "Temperature gauge",
    description: "Official ECharts temperature gauge (dual arc)",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 12);
      const layout = gaugeLayout("temp");
      const track = gs(ctx, 22, 12);
      const inner = Math.max(4, Math.round(track * 0.28));
      const color = accentOf(ctx, "#FFAB91");
      const colorHot = accentOf(ctx, "#FD7347");
      return {
        series: [
          {
            type: "gauge",
            ...layout,
            startAngle: 200,
            endAngle: -20,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            itemStyle: { color },
            progress: { show: true, width: track },
            pointer: { show: false },
            axisLine: { lineStyle: { width: track } },
            axisTick: {
              distance: -Math.round(track * 1.35),
              splitNumber: 5,
              lineStyle: { width: 2, color: "#999" },
            },
            splitLine: {
              distance: -Math.round(track * 1.55),
              length: gs(ctx, 10, 5),
              lineStyle: { width: 3, color: "#999" },
            },
            axisLabel: {
              distance: Math.max(8, Math.round(track * 0.15)),
              color: "#999",
              fontSize: gs(ctx, 12, 9),
              formatter: fmtAxisLabel,
            },
            anchor: { show: false },
            title: { show: false },
            detail: {
              valueAnimation: true,
              width: "60%",
              lineHeight: gs(ctx, 24, 14),
              borderRadius: 8,
              offsetCenter: [0, "-10%"],
              fontSize: gs(ctx, 28, 16),
              fontWeight: "bolder",
              formatter: (v: number) => fmtValue(ctx, v),
              color: "inherit",
            },
            data: [{ value: ctx.value }],
          },
          {
            type: "gauge",
            ...layout,
            startAngle: 200,
            endAngle: -20,
            min: a.min,
            max: a.max,
            itemStyle: { color: colorHot },
            progress: { show: true, width: inner },
            pointer: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { show: false },
            data: [{ value: ctx.value }],
          },
        ],
      };
    },
  },
  {
    id: "gauge-ring",
    label: "Ring gauge",
    description: "Official ring score style (single value)",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const width = gs(ctx, 28, 14);
      const pctSpan = Math.max(1e-6, ctx.max - ctx.min);
      const pct = Math.round(((ctx.value - ctx.min) / pctSpan) * 1000) / 10;
      const layout = gaugeLayout("ring");
      return {
        series: [
          {
            type: "gauge",
            startAngle: 90,
            endAngle: -270,
            min: 0,
            max: 100,
            splitNumber: 5,
            ...layout,
            pointer: { show: false },
            progress: {
              show: true,
              overlap: false,
              roundCap: true,
              clip: false,
              width,
              itemStyle: {
                borderWidth: 1,
                borderColor: "#464646",
                color: accentOf(ctx),
              },
            },
            axisLine: { lineStyle: { width } },
            splitLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            data: [
              {
                value: Math.min(100, Math.max(0, pct)),
                name: ctx.title || "Value",
                title: { offsetCenter: ["0%", "-20%"] },
                detail: { offsetCenter: ["0%", "10%"] },
              },
            ],
            title: { fontSize: gs(ctx, 12, 9), color: "#999" },
            detail: {
              width: gs(ctx, 56, 36),
              height: gs(ctx, 18, 12),
              fontSize: gs(ctx, 16, 11),
              color: "inherit",
              borderColor: "inherit",
              borderRadius: 20,
              borderWidth: 1,
              formatter: () => fmtValue(ctx, ctx.value),
            },
          },
        ],
      };
    },
  },
  {
    id: "gauge-barometer",
    label: "Barometer",
    description: "Official barometer-style dial",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 10);
      const layout = gaugeLayout("full");
      return {
        series: [
          {
            type: "gauge",
            ...layout,
            radius: "75%",
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            axisLine: {
              lineStyle: { color: [[1, accentOf(ctx, "#f00")]], width: 3 },
            },
            splitLine: {
              distance: -gs(ctx, 12, 6),
              length: gs(ctx, 12, 6),
              lineStyle: { color: accentOf(ctx, "#f00") },
            },
            axisTick: {
              distance: -gs(ctx, 8, 4),
              length: gs(ctx, 8, 4),
              lineStyle: { color: accentOf(ctx, "#f00") },
            },
            axisLabel: {
              distance: gs(ctx, 14, 8),
              color: accentOf(ctx, "#f00"),
              fontSize: gs(ctx, 11, 9),
              formatter: fmtAxisLabel,
            },
            anchor: {
              show: true,
              size: gs(ctx, 14, 8),
              itemStyle: { borderColor: "#000", borderWidth: 2 },
            },
            pointer: {
              offsetCenter: [0, "10%"],
              icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
              length: "100%",
              itemStyle: { color: "#000" },
            },
            detail: {
              valueAnimation: true,
              formatter: (v: number) => fmtValue(ctx, v),
              fontSize: gs(ctx, 16, 11),
              offsetCenter: [0, "70%"],
            },
            title: { offsetCenter: [0, "-50%"], fontSize: gs(ctx, 11, 8) },
            data: [{ value: ctx.value, name: ctx.title || "PLP" }],
          },
        ],
      };
    },
  },
  {
    id: "gauge-clock",
    label: "Clock gauge",
    description: "Round clock-face dial (value as pointer)",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: GAUGE_SIZE,
    buildOption: (ctx) => {
      const a = axis(ctx, 12);
      const layout = gaugeLayout("full");
      return {
        series: [
          {
            type: "gauge",
            startAngle: 90,
            endAngle: -270,
            ...layout,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            clockwise: true,
            axisLine: {
              lineStyle: {
                width: gs(ctx, 12, 7),
                color: [[1, "rgba(0,0,0,0.55)"]],
              },
            },
            splitLine: {
              length: gs(ctx, 12, 6),
              lineStyle: { width: 2, color: "#333" },
            },
            axisTick: { length: gs(ctx, 6, 3) },
            axisLabel: {
              fontSize: gs(ctx, 11, 9),
              distance: gs(ctx, 14, 8),
              color: "#333",
              formatter: fmtAxisLabel,
            },
            pointer: {
              icon: "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
              width: gs(ctx, 8, 4),
              length: "60%",
              offsetCenter: [0, "8%"],
              itemStyle: { color: accentOf(ctx, "#C0911F") },
            },
            anchor: {
              show: true,
              size: gs(ctx, 12, 6),
              itemStyle: { color: accentOf(ctx, "#C0911F") },
            },
            detail: {
              formatter: (v: number) => fmtValue(ctx, v),
              fontSize: gs(ctx, 16, 11),
              offsetCenter: [0, "70%"],
            },
            title: { show: false },
            data: [{ value: ctx.value }],
          },
        ],
      };
    },
  },
  {
    id: "gauge-car",
    label: "Car dashboard",
    description: "Automotive-style speed dial",
    family: "gauge",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: { w: 6, h: 5 },
    buildOption: (ctx) => {
      const a = axis(ctx, 10);
      const layout = gaugeLayout("full");
      const band = gs(ctx, 18, 10);
      return {
        series: [
          {
            type: "gauge",
            center: ["50%", "58%"],
            radius: layout.radius,
            min: a.min,
            max: a.max,
            splitNumber: a.splitNumber,
            axisLine: {
              lineStyle: {
                width: band,
                color: [
                  [0.4, "#91cc75"],
                  [0.7, "#fac858"],
                  [1, "#ee6666"],
                ],
              },
            },
            pointer: {
              icon: "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
              length: "60%",
              width: gs(ctx, 6, 3),
              offsetCenter: [0, "8%"],
            },
            axisTick: {
              distance: -band,
              length: gs(ctx, 8, 4),
              lineStyle: { color: "#fff", width: 2 },
            },
            splitLine: {
              distance: -band,
              length: gs(ctx, 14, 7),
              lineStyle: { color: "#fff", width: 3 },
            },
            axisLabel: {
              distance: gs(ctx, 18, 10),
              fontSize: gs(ctx, 11, 8),
              color: "#666",
              formatter: fmtAxisLabel,
            },
            detail: {
              valueAnimation: true,
              formatter: (v: number) => fmtValue(ctx, v),
              fontSize: gs(ctx, 20, 14),
              offsetCenter: [0, "75%"],
            },
            title: { offsetCenter: [0, "92%"], fontSize: gs(ctx, 11, 8) },
            data: [{ value: ctx.value, name: ctx.title }],
          },
        ],
      };
    },
  },
];
