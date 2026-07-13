"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WidgetChartType } from "@/types/dashboard";
import { seriesColorForSensor } from "@/lib/multi-sensor-chart";
import { normalizeChartType } from "@/lib/widget-appearance";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatChartAxisTick, formatChartTooltipTime } from "@/lib/chart-time";
import { cn } from "@/lib/utils";

interface DataPoint {
  time: string;
  value: number;
}

const AXIS_TICK = { fontSize: 10, fill: "var(--foreground)" };

export function SensorChart({
  data,
  unit,
  chartType,
  sensorType,
  sensorName,
  fillHeight = false,
}: {
  data: DataPoint[];
  unit?: string | null;
  chartType?: WidgetChartType;
  sensorType?: string;
  sensorName?: string;
  fillHeight?: boolean;
}) {
  const kind = normalizeChartType(chartType);
  const strokeColor = seriesColorForSensor(sensorType || "", sensorName || "", 0);
  const formatted = data.map((d) => ({
    time: new Date(d.time).getTime(),
    value: d.value,
  }));

  if (formatted.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          fillHeight ? "h-full min-h-[80px]" : "h-48"
        )}
      >
        No history data yet. Readings appear after ESP32 publishes for a few minutes.
      </div>
    );
  }

  const axes = (
    <>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis
        dataKey="time"
        type="number"
        scale="time"
        domain={["dataMin", "dataMax"]}
        tickFormatter={(v) => formatChartAxisTick(Number(v))}
        tick={AXIS_TICK}
        axisLine={{ stroke: "var(--border)" }}
        tickLine={{ stroke: "var(--border)" }}
        tickCount={6}
        minTickGap={28}
      />
      <YAxis
        tick={AXIS_TICK}
        axisLine={{ stroke: "var(--border)" }}
        tickLine={{ stroke: "var(--border)" }}
        unit={unit || ""}
      />
      <Tooltip
        content={
          <ChartTooltip
            labelFormatter={(label) => formatChartTooltipTime(label)}
            valueFormatter={(value) => `${value}${unit ? ` ${unit}` : ""}`}
          />
        }
        cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        wrapperStyle={{ zIndex: 50, outline: "none" }}
      />
    </>
  );

  return (
    <div
      className={cn(
        "damn-chart w-full text-foreground",
        fillHeight ? "h-full min-h-[100px]" : undefined
      )}
    >
      <ResponsiveContainer width="100%" height={fillHeight ? "100%" : 200}>
        {kind === "area" ? (
          <AreaChart data={formatted} margin={fillHeight ? { top: 2, right: 2, left: -8, bottom: 0 } : undefined}>
            {axes}
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              fill={strokeColor}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </AreaChart>
        ) : kind === "bar" ? (
          <BarChart data={formatted} margin={fillHeight ? { top: 2, right: 2, left: -8, bottom: 0 } : undefined}>
            {axes}
            <Bar dataKey="value" fill={strokeColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={formatted} margin={fillHeight ? { top: 2, right: 2, left: -8, bottom: 0 } : undefined}>
            {axes}
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor, stroke: "var(--background)" }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
