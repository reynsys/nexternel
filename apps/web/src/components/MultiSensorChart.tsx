"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  mergeSensorHistories,
  type SensorSeries,
  uniqueUnits,
  yAxisIdForUnit,
} from "@/lib/multi-sensor-chart";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatChartAxisTick, formatChartTooltipTime } from "@/lib/chart-time";
import { cn } from "@/lib/utils";

const AXIS_TICK = { fontSize: 10, fill: "var(--foreground)" };

const WIDGET_CHART_MARGIN = { top: 2, right: 2, left: -8, bottom: 0 };

export function MultiSensorChart({
  series,
  fillHeight = false,
  compact = false,
}: {
  series: SensorSeries[];
  fillHeight?: boolean;
  compact?: boolean;
}) {
  const active = series.filter((s) => s.points.length > 0);
  const data = mergeSensorHistories(active);
  const units = uniqueUnits(active);
  const perSeriesAxis = units.length > 2;
  const isCompact = compact || fillHeight;

  if (active.length === 0 || data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          fillHeight ? "h-full min-h-[80px]" : "h-52"
        )}
      >
        No history data yet. Readings appear after the device publishes for a few minutes.
      </div>
    );
  }

  const margin = isCompact ? WIDGET_CHART_MARGIN : { top: 8, right: 12, left: 4, bottom: 0 };
  const yAxisWidth = isCompact ? 32 : 44;

  return (
    <div
      className={cn(
        "damn-chart w-full text-foreground",
        fillHeight ? "h-full min-h-[100px]" : undefined
      )}
    >
      <ResponsiveContainer width="100%" height={fillHeight ? "100%" : 240}>
        <LineChart data={data} margin={margin}>
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
          {perSeriesAxis
            ? active.map((s, index) => (
                <YAxis
                  key={s.id}
                  yAxisId={s.key}
                  orientation={index === 0 ? "left" : "right"}
                  tick={AXIS_TICK}
                  axisLine={{ stroke: s.color }}
                  tickLine={{ stroke: s.color }}
                  width={index > 1 ? 0 : yAxisWidth}
                  hide={index > 1}
                  unit={isCompact ? "" : s.unit ? ` ${s.unit}` : ""}
                />
              ))
            : units.map((unit, index) => (
                <YAxis
                  key={unit}
                  yAxisId={yAxisIdForUnit(unit, units)}
                  orientation={index === 0 ? "left" : "right"}
                  tick={AXIS_TICK}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  width={yAxisWidth}
                  unit={isCompact ? "" : unit.length <= 6 ? ` ${unit}` : ""}
                />
              ))}
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(label) => formatChartTooltipTime(label)}
                nameFormatter={(name) =>
                  active.find((row) => row.key === name)?.label ?? name
                }
                valueFormatter={(value, name) => {
                  const s = active.find((row) => row.key === name);
                  const unit = s?.unit ? ` ${s.unit}` : "";
                  return `${value}${unit}`;
                }}
              />
            }
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            wrapperStyle={{ zIndex: 50, outline: "none" }}
          />
          <Legend
            verticalAlign="bottom"
            height={isCompact ? 14 : 24}
            iconSize={isCompact ? 6 : 10}
            wrapperStyle={{
              fontSize: isCompact ? 9 : 12,
              color: "var(--foreground)",
              paddingTop: isCompact ? 2 : 8,
            }}
            formatter={(value) => {
              const s = active.find((row) => row.key === value);
              return s?.label ?? value;
            }}
          />
          {active.map((s) => {
            const yAxisId = perSeriesAxis
              ? s.key
              : yAxisIdForUnit(s.unit || s.label, units);
            return (
              <Line
                key={s.id}
                yAxisId={yAxisId}
                type="monotone"
                dataKey={s.key}
                name={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: s.color, stroke: "var(--background)" }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
