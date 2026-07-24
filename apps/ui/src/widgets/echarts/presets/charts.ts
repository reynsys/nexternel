import type { EchartsBuildCtx, EchartsPreset } from "../types";

function timeSeries(ctx: EchartsBuildCtx): [string, number][] {
  return ctx.points.map((p) => [p.t, p.v]);
}

function accent(ctx: EchartsBuildCtx, fallback = "#5470c6"): string {
  return ctx.accent || fallback;
}

function yFmt(ctx: EchartsBuildCtx) {
  return (v: number) => (ctx.unit ? `${v}${ctx.unit}` : String(v));
}

const historyGrid = { left: 40, right: 16, top: 28, bottom: 28 };

export const CHART_PRESETS: EchartsPreset[] = [
  {
    id: "line-basic",
    label: "Line chart",
    description: "Basic time-series line from history",
    family: "line",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => ({
      animation: false,
      grid: historyGrid,
      tooltip: { trigger: "axis" },
      xAxis: { type: "time", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
      },
      series: [
        {
          name: ctx.title,
          type: "line",
          showSymbol: false,
          data: timeSeries(ctx),
          itemStyle: { color: accent(ctx) },
        },
      ],
    }),
  },
  {
    id: "line-smooth",
    label: "Smooth line",
    description: "Smoothed history line",
    family: "line",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => ({
      animation: false,
      grid: historyGrid,
      tooltip: { trigger: "axis" },
      xAxis: { type: "time", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
      },
      series: [
        {
          name: ctx.title,
          type: "line",
          smooth: true,
          showSymbol: false,
          data: timeSeries(ctx),
          itemStyle: { color: accent(ctx) },
        },
      ],
    }),
  },
  {
    id: "area-basic",
    label: "Area chart",
    description: "Filled area over time",
    family: "area",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => ({
      animation: false,
      grid: historyGrid,
      tooltip: { trigger: "axis" },
      xAxis: { type: "time", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
      },
      series: [
        {
          name: ctx.title,
          type: "line",
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.35 },
          data: timeSeries(ctx),
          itemStyle: { color: accent(ctx) },
        },
      ],
    }),
  },
  {
    id: "area-stack",
    label: "Stacked area",
    description: "Area with stacked visual (single series)",
    family: "area",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => ({
      animation: false,
      grid: historyGrid,
      tooltip: { trigger: "axis" },
      xAxis: { type: "time", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
      },
      series: [
        {
          name: ctx.title,
          type: "line",
          stack: "Total",
          areaStyle: {},
          showSymbol: false,
          data: timeSeries(ctx),
          itemStyle: { color: accent(ctx, "#91cc75") },
        },
      ],
    }),
  },
  {
    id: "bar-basic",
    label: "Bar chart",
    description: "Vertical bars from history samples",
    family: "bar",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => ({
      animation: false,
      grid: historyGrid,
      tooltip: { trigger: "axis" },
      xAxis: { type: "time", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
      },
      series: [
        {
          name: ctx.title,
          type: "bar",
          data: timeSeries(ctx),
          itemStyle: { color: accent(ctx) },
        },
      ],
    }),
  },
  {
    id: "bar-horizontal",
    label: "Horizontal bar",
    description: "Category bars (binned history)",
    family: "bar",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => {
      const sample = ctx.points.slice(-12);
      return {
        animation: false,
        grid: { left: 72, right: 16, top: 16, bottom: 24 },
        tooltip: { trigger: "axis" },
        yAxis: {
          type: "category",
          data: sample.map((p) =>
            new Date(p.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          ),
          axisLabel: { fontSize: 9 },
        },
        xAxis: {
          type: "value",
          axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
        },
        series: [
          {
            type: "bar",
            data: sample.map((p) => p.v),
            itemStyle: { color: accent(ctx) },
          },
        ],
      };
    },
  },
  {
    id: "pie-basic",
    label: "Pie chart",
    description: "Live value vs remaining-to-max",
    family: "pie",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: { w: 4, h: 4 },
    buildOption: (ctx) => {
      const used = Math.max(0, ctx.value - ctx.min);
      const span = Math.max(1, ctx.max - ctx.min);
      const remain = Math.max(0, span - used);
      return {
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            radius: "70%",
            data: [
              { name: ctx.title || "Value", value: used },
              { name: "Remaining", value: remain },
            ],
            label: { fontSize: 11 },
            itemStyle: { borderRadius: 4 },
            color: [accent(ctx), "rgba(128,128,128,0.25)"],
          },
        ],
      };
    },
  },
  {
    id: "pie-doughnut",
    label: "Doughnut",
    description: "Ring pie of value vs max",
    family: "pie",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: { w: 4, h: 4 },
    buildOption: (ctx) => {
      const used = Math.max(0, ctx.value - ctx.min);
      const span = Math.max(1, ctx.max - ctx.min);
      const remain = Math.max(0, span - used);
      return {
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            radius: ["45%", "70%"],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6 },
            label: {
              show: true,
              position: "center",
              formatter: () =>
                ctx.unit
                  ? `${Number.isInteger(ctx.value) ? ctx.value : ctx.value.toFixed(1)}\n${ctx.unit}`
                  : String(Number.isInteger(ctx.value) ? ctx.value : ctx.value.toFixed(1)),
              fontSize: 14,
            },
            data: [
              { name: "Value", value: used },
              { name: "Remaining", value: remain },
            ],
            color: [accent(ctx, "#91cc75"), "rgba(128,128,128,0.2)"],
          },
        ],
      };
    },
  },
  {
    id: "pie-rose",
    label: "Nightingale (rose)",
    description: "Rose pie from recent history buckets",
    family: "pie",
    category: "sensors",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 5, h: 4 },
    buildOption: (ctx) => {
      const sample = ctx.points.slice(-8);
      return {
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            roseType: "area",
            radius: ["15%", "70%"],
            itemStyle: { borderRadius: 4 },
            data:
              sample.length > 0
                ? sample.map((p, i) => ({
                    name: `#${i + 1}`,
                    value: Math.abs(p.v),
                  }))
                : [{ name: "Value", value: Math.abs(ctx.value) || 1 }],
          },
        ],
      };
    },
  },
  {
    id: "scatter-basic",
    label: "Scatter",
    description: "Scatter of history points",
    family: "scatter",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 4 },
    buildOption: (ctx) => ({
      animation: false,
      grid: historyGrid,
      tooltip: { trigger: "item" },
      xAxis: { type: "time", axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: yFmt(ctx) },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 8,
          data: timeSeries(ctx),
          itemStyle: { color: accent(ctx, "#ee6666") },
        },
      ],
    }),
  },
  {
    id: "radar-basic",
    label: "Radar",
    description: "Radar axes from min/max and live value",
    family: "radar",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: { w: 4, h: 4 },
    buildOption: (ctx) => {
      const mid = (ctx.min + ctx.max) / 2;
      return {
        radar: {
          indicator: [
            { name: ctx.title || "Value", max: ctx.max },
            { name: "Mid", max: ctx.max },
            { name: "Span", max: ctx.max },
            { name: "Floor", max: ctx.max },
            { name: "Ceil", max: ctx.max },
          ],
        },
        series: [
          {
            type: "radar",
            data: [
              {
                value: [ctx.value, mid, ctx.max - ctx.min, ctx.min, ctx.max],
                name: ctx.title,
                areaStyle: { opacity: 0.25 },
              },
            ],
            itemStyle: { color: accent(ctx) },
          },
        ],
      };
    },
  },
  {
    id: "funnel-basic",
    label: "Funnel",
    description: "Funnel of value bands toward max",
    family: "funnel",
    category: "sensors",
    dataMode: "live",
    needsCapability: true,
    defaultSize: { w: 4, h: 4 },
    buildOption: (ctx) => {
      const v = Math.max(0, ctx.value);
      return {
        tooltip: { trigger: "item" },
        series: [
          {
            type: "funnel",
            left: "10%",
            width: "80%",
            label: { fontSize: 11 },
            data: [
              { name: "Max", value: ctx.max },
              { name: "Value", value: v },
              { name: "Half", value: v / 2 },
              { name: "Min", value: Math.max(ctx.min, 0) },
            ].sort((a, b) => b.value - a.value),
          },
        ],
      };
    },
  },
  {
    id: "heatmap-basic",
    label: "Heatmap",
    description: "Hour × weekday intensity from history",
    family: "heatmap",
    category: "history",
    dataMode: "history",
    needsCapability: true,
    defaultSize: { w: 6, h: 5 },
    buildOption: (ctx) => {
      const hours = Array.from({ length: 24 }, (_, i) => String(i));
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const bucket = new Map<string, { sum: number; n: number }>();
      for (const p of ctx.points) {
        const d = new Date(p.t);
        const key = `${d.getDay()}-${d.getHours()}`;
        const cur = bucket.get(key) ?? { sum: 0, n: 0 };
        cur.sum += p.v;
        cur.n += 1;
        bucket.set(key, cur);
      }
      const data: [number, number, number][] = [];
      let vmax = 1;
      for (const [key, { sum, n }] of bucket) {
        const [day, hour] = key.split("-").map(Number);
        const avg = sum / n;
        vmax = Math.max(vmax, avg);
        data.push([hour!, day!, Math.round(avg * 100) / 100]);
      }
      return {
        tooltip: { position: "top" },
        grid: { left: 40, right: 16, top: 16, bottom: 40 },
        xAxis: { type: "category", data: hours, splitArea: { show: true } },
        yAxis: { type: "category", data: days, splitArea: { show: true } },
        visualMap: {
          min: 0,
          max: vmax,
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          inRange: { color: ["#e0f3ff", accent(ctx, "#5470c6")] },
        },
        series: [
          {
            type: "heatmap",
            data,
            label: { show: false },
            emphasis: { itemStyle: { shadowBlur: 6 } },
          },
        ],
      };
    },
  },
  {
    id: "blank",
    label: "ECharts blank",
    description: "Empty shell — configure entirely via Advanced JSON",
    family: "custom",
    category: "system",
    dataMode: "none",
    needsCapability: false,
    defaultSize: { w: 4, h: 4 },
    buildOption: () => ({
      title: {
        text: "Blank ECharts",
        subtext: "Set optionOverride in Edit",
        left: "center",
        top: "middle",
        textStyle: { fontSize: 14 },
        subtextStyle: { fontSize: 11 },
      },
    }),
  },
];
