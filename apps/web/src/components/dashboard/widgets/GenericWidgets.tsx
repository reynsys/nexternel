"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AnalogClockStyle,
  DigitalClockStyle,
  WidgetAppearanceConfig,
  WidgetConfig,
} from "@/types/dashboard";
import {
  getBodyFontClass,
  getTitleFontClass,
  getValueFontClass,
  getWidgetShellClasses,
} from "@/lib/widget-appearance";
import {
  WIDGET_FIT_BODY,
  WIDGET_FIT_BODY_REGION,
  WIDGET_FIT_GAUGE,
  WIDGET_FIT_INNER,
  WIDGET_FIT_INNER_CENTERED,
  WIDGET_FIT_TITLE,
  WIDGET_FIT_VALUE,
  WIDGET_SHOW_WHEN_TALL,
} from "@/lib/dashboard-grid";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";
import { weatherIconClassForCode, weatherIconForCode } from "@/lib/weather-icons";
import { Droplets, Wind, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkSpeedGauge } from "@/library/widgets/gauges/NetworkSpeedGauge";
import { savedGaugePlatform } from "@/widget-platform/resolve/instance";
import { SpeedTestDial } from "@/widget-platform/renderer/SpeedTestDial";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Shell({
  appearance,
  editPreview,
  children,
  className,
  fit = true,
  centered = false,
  tall = false,
}: {
  appearance?: WidgetAppearanceConfig;
  editPreview?: boolean;
  children: React.ReactNode;
  className?: string;
  fit?: boolean;
  centered?: boolean;
  tall?: boolean;
}) {
  const innerClass = centered
    ? WIDGET_FIT_INNER_CENTERED
    : tall
      ? cn(WIDGET_FIT_INNER, "justify-center")
      : WIDGET_FIT_INNER;

  return (
    <div className={cn(getWidgetShellClasses(appearance, editPreview), className)}>
      {fit ? <div className={innerClass}>{children}</div> : children}
    </div>
  );
}

function AnalogClock({
  now,
  style = "classic",
}: {
  now: Date;
  style?: AnalogClockStyle;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(100);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize(Math.floor(Math.min(w, h)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hourDeg = h * 30 + m * 0.5;
  const minuteDeg = m * 6;
  const secondDeg = s * 6;

  const roman = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  const tickOuter = style === "minimal" ? 50 : 48;
  const tickInner = style === "minimal" ? 52 : 52;
  const strokeW = style === "minimal" ? 1 : 2;
  const faceStroke = style === "roman" ? 3 : 2;

  return (
    <div ref={containerRef} className="h-full w-full min-h-0 min-w-0 flex-1">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className="mx-auto block max-h-full max-w-full"
      >
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke="var(--border)"
          strokeWidth={faceStroke}
        />
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 60 + Math.sin(angle) * tickOuter;
          const y1 = 60 - Math.cos(angle) * tickOuter;
          const x2 = 60 + Math.sin(angle) * tickInner;
          const y2 = 60 - Math.cos(angle) * tickInner;
          return (
            <line
              key={`t-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--muted-foreground)"
              strokeWidth={strokeW}
            />
          );
        })}
        {style === "roman" &&
          roman.map((label, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x = 60 + Math.sin(angle) * 40;
            const y = 60 - Math.cos(angle) * 40;
            return (
              <text
                key={label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--muted-foreground)"
                fontSize="7"
                fontFamily="serif"
              >
                {label}
              </text>
            );
          })}
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="34"
          stroke="#7ec8e3"
          strokeWidth={style === "minimal" ? 2.5 : 3}
          strokeLinecap="round"
          transform={`rotate(${hourDeg} 60 60)`}
        />
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="24"
          stroke="#fdba74"
          strokeWidth={style === "minimal" ? 1.5 : 2}
          strokeLinecap="round"
          transform={`rotate(${minuteDeg} 60 60)`}
        />
        {style !== "minimal" && (
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="20"
            stroke="var(--primary)"
            strokeWidth="1"
            strokeLinecap="round"
            transform={`rotate(${secondDeg} 60 60)`}
          />
        )}
        <circle cx="60" cy="60" r="3" fill="var(--primary)" />
      </svg>
    </div>
  );
}

function DigitalClockFace({
  now,
  style,
  showSeconds,
  appearance,
}: {
  now: Date;
  style: DigitalClockStyle;
  showSeconds: boolean;
  appearance?: WidgetAppearanceConfig;
}) {
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
  });
  const dateStr = now.toLocaleDateString([], {
    weekday: style === "bold" ? "short" : "long",
    day: "numeric",
    month: style === "bold" ? "short" : "long",
  });

  return (
    <>
      <p
        className={cn(
          "font-bold tabular-nums text-foreground",
          style === "mono" && "font-mono tracking-widest",
          style === "bold" && "font-black uppercase tracking-tight",
          appearance?.fontSize ? getValueFontClass(appearance.fontSize) : "widget-fit-clock-value"
        )}
      >
        {timeStr}
      </p>
      <p
        className={cn(
          "mt-1 text-muted-foreground",
          style === "bold" && "font-semibold uppercase tracking-wide",
          appearance?.fontSize ? getBodyFontClass(appearance.fontSize) : "widget-fit-clock-date"
        )}
      >
        {dateStr}
      </p>
    </>
  );
}

export function TimeWidget({
  config,
  appearance,
  title,
  rowSpan = 1,
  editPreview,
}: {
  config: WidgetConfig;
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const now = useNow(config.showSeconds === false ? 30_000 : 1000);
  const digital = config.timeMode !== "analog";
  const analogStyle = config.analogClockStyle || "classic";
  const digitalStyle = config.digitalClockStyle || "standard";

  return (
    <Shell appearance={appearance} fit={false} className="flex h-full flex-col">
      {title ? <WidgetTitleBar title={title} /> : null}
      <div className="flex flex-1 flex-col items-center justify-center">
        {digital ? (
          <DigitalClockFace
            now={now}
            style={digitalStyle}
            showSeconds={config.showSeconds !== false}
            appearance={appearance}
          />
        ) : (
          <AnalogClock now={now} style={analogStyle} />
        )}
      </div>
    </Shell>
  );
}

export function CalendarWidget({
  appearance,
  title,
  colSpan = 1,
  rowSpan = 1,
  editPreview,
}: {
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  colSpan?: number;
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const now = useNow(60_000);
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDayJs = new Date(year, month, 1).getDay();
  const firstDay = (firstDayJs + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const compact = colSpan <= 1 && rowSpan <= 1;
  const monthName = now.toLocaleDateString(
    [],
    compact ? { month: "short", year: "numeric" } : { month: "long", year: "numeric" }
  );
  const weekDays = compact
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayRows = Math.ceil(cells.length / 7);

  return (
    <Shell appearance={appearance} editPreview={editPreview} fit={false} className="flex h-full min-h-0 flex-col overflow-hidden">
      {title ? <WidgetTitleBar title={title} /> : null}
      <div className="flex w-full min-h-0 flex-1 flex-col justify-center overflow-hidden">
        <p
          className={cn(
            "shrink-0 font-semibold text-foreground",
            compact ? "mb-1 text-xs leading-tight sm:text-sm" : "mb-2 text-sm sm:text-base",
            !compact && appearance?.fontSize && getBodyFontClass(appearance.fontSize)
          )}
        >
          {monthName}
        </p>
        <div
          className="grid min-h-0 w-full flex-1 grid-cols-7 gap-0.5 text-center leading-none"
          style={{ gridTemplateRows: `auto repeat(${dayRows}, minmax(0, 1fr))` }}
        >
          {weekDays.map((d, i) => (
            <span
              key={`${d}-${i}`}
              className={cn(
                "flex items-center justify-center font-semibold text-muted-foreground",
                compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"
              )}
            >
              {d}
            </span>
          ))}
          {cells.map((day, i) => (
            <span
              key={i}
              className={cn(
                "flex min-h-0 items-center justify-center rounded-sm font-medium",
                compact
                  ? "text-[clamp(10px,3.8cqi,14px)]"
                  : "text-[clamp(12px,4.8cqi,18px)]",
                day === today && "bg-primary font-bold text-primary-foreground",
                day && day !== today && "text-foreground"
              )}
            >
              {day ?? ""}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function WeatherWidget({
  config,
  appearance,
  title,
  rowSpan = 1,
  editPreview,
}: {
  config: WidgetConfig;
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const [data, setData] = useState<{
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    weatherCode?: number;
    description?: string;
    forecast?: {
      date: string;
      weatherCode?: number;
      description: string;
      tempMax?: number;
      tempMin?: number;
    }[];
  } | null>(null);

  const lat = config.weatherLat ?? 51.5074;
  const lon = config.weatherLon ?? -0.1278;
  const location = config.weatherLocation || title || "Weather";

  useEffect(() => {
    if (editPreview) return;
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
    const id = setInterval(() => {
      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 900_000);
    return () => clearInterval(id);
  }, [lat, lon, editPreview]);

  if (editPreview) {
    return (
      <Shell appearance={appearance} editPreview>
        <p className={cn("font-semibold", getTitleFontClass(appearance?.fontSize))}>{location}</p>
        <p className={cn("mt-2 text-muted-foreground", getBodyFontClass(appearance?.fontSize))}>
          Today + next 5 days · mph
        </p>
      </Shell>
    );
  }

  const currentCode = data?.weatherCode ?? 0;
  const CurrentIcon = weatherIconForCode(currentCode);
  const currentIconClass = weatherIconClassForCode(currentCode);
  const todayForecast = data?.forecast?.[0];
  const todayMax =
    todayForecast?.tempMax != null ? `${Math.round(todayForecast.tempMax)}°` : null;
  const todayMin =
    todayForecast?.tempMin != null ? `${Math.round(todayForecast.tempMin)}°` : null;
  const upcomingForecast = data?.forecast?.slice(1, 6) ?? [];
  const bodyClass = appearance?.fontSize ? getBodyFontClass(appearance.fontSize) : WIDGET_FIT_BODY;
  const valueClass = appearance?.fontSize ? getValueFontClass(appearance.fontSize) : WIDGET_FIT_VALUE;

  return (
    <Shell appearance={appearance} fit={false} className="flex h-full min-h-0 flex-col overflow-hidden">
      <WidgetTitleBar title={location} />
      <div className="flex shrink-0 items-center justify-center gap-2 px-1 pb-2 pt-0.5">
        {(todayMax || todayMin) && (
          <div className={cn("flex shrink-0 flex-col gap-0.5 text-left leading-tight", bodyClass)}>
            <span className="whitespace-nowrap text-[10px] tabular-nums text-foreground">
              {todayMax ?? "—"}
              {todayMin && (
                <span className="text-muted-foreground"> / {todayMin}</span>
              )}
            </span>
          </div>
        )}
        <CurrentIcon
          className={cn("size-8 shrink-0", currentIconClass)}
          strokeWidth={1.5}
          aria-hidden
        />
        <p className={cn("shrink-0 font-bold tabular-nums leading-none text-foreground", valueClass)}>
          {data?.temperature !== undefined ? `${Math.round(data.temperature)}°C` : "—"}
        </p>
        <div className={cn("flex shrink-0 flex-col gap-0.5 text-left leading-tight", bodyClass)}>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Droplets className="size-3.5 shrink-0 text-sky-500" aria-hidden />
            {data?.humidity ?? "—"}%
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Wind className="size-3.5 shrink-0" aria-hidden />
            {data?.windSpeed != null ? `${Math.round(data.windSpeed)} mph` : "—"}
          </span>
        </div>
      </div>
      {upcomingForecast.length > 0 && (
        <div className="mt-auto grid w-full shrink-0 grid-cols-5 gap-1 border-t border-border/50 pt-2">
          {upcomingForecast.map((day) => {
            const label = new Date(day.date).toLocaleDateString([], { weekday: "short" });
            const code = day.weatherCode ?? 0;
            const DayIcon = weatherIconForCode(code);
            const max = day.tempMax != null ? `${Math.round(day.tempMax)}°` : "—";
            const min = day.tempMin != null ? `${Math.round(day.tempMin)}°` : "—";
            return (
              <div key={day.date} className="flex min-w-0 flex-col items-center gap-0.5 leading-tight">
                <p className="text-[9px] font-medium text-muted-foreground">{label}</p>
                <DayIcon
                  className={cn("size-4 shrink-0", weatherIconClassForCode(code))}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="whitespace-nowrap text-[10px] tabular-nums text-foreground">
                  {max}
                  <span className="text-muted-foreground"> / {min}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

export function SystemInfoWidget({
  appearance,
  title,
  rowSpan = 1,
  editPreview,
}: {
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const [info, setInfo] = useState<{
    version?: string;
    uptimeSeconds?: number;
    cpu?: { model?: string; cores?: number; loadPercent?: number };
    memory?: { totalMb?: number; usedMb?: number; freeMb?: number };
    serverTemperatureC?: number | null;
  } | null>(null);

  useEffect(() => {
    if (editPreview) return;
    fetch("/api/system/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
    const id = setInterval(() => {
      fetch("/api/system/info")
        .then((r) => r.json())
        .then(setInfo)
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [editPreview]);

  const bodyClass = getBodyFontClass(appearance?.fontSize);

  if (editPreview) {
    return (
      <Shell appearance={appearance} editPreview>
        <p className={cn("font-semibold", getTitleFontClass(appearance?.fontSize))}>
          {title || "System"}
        </p>
        <p className={cn("mt-2 text-muted-foreground", bodyClass)}>
          Version, uptime, CPU, RAM, and server temperature
        </p>
      </Shell>
    );
  }

  const mem = info?.memory;
  const cpu = info?.cpu;

  const memPercent =
    mem?.usedMb != null && mem?.totalMb ? Math.round((mem.usedMb / mem.totalMb) * 100) : null;

  return (
    <Shell appearance={appearance} fit={false} className="flex h-full flex-col">
      {title ? <WidgetTitleBar title={title} /> : null}
      <div className={cn("flex w-full flex-1 flex-col", rowSpan > 1 && "justify-center")}>
      <dl
        className={cn(
          "w-full max-w-xs shrink-0 space-y-0.5",
          appearance?.fontSize ? bodyClass : WIDGET_FIT_BODY
        )}
      >
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-mono">{info?.version || "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Uptime</dt>
          <dd>
            {info?.uptimeSeconds
              ? `${Math.floor(info.uptimeSeconds / 3600)}h ${Math.floor((info.uptimeSeconds % 3600) / 60)}m`
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">CPU</dt>
          <dd>{cpu?.loadPercent != null ? `${cpu.loadPercent}%` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Memory</dt>
          <dd>{memPercent != null ? `${memPercent}%` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Server temp</dt>
          <dd>
            {info?.serverTemperatureC != null ? `${info.serverTemperatureC}°C` : "—"}
          </dd>
        </div>
      </dl>
      </div>
    </Shell>
  );
}

export function ActivityLogWidget({
  config,
  appearance,
  title,
  editPreview,
  className,
}: {
  config: WidgetConfig;
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  editPreview?: boolean;
  className?: string;
}) {
  const [logs, setLogs] = useState<
    { id: string; category: string; message: string; createdAt: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limit = config.logLimit ?? 100;
  const visibleRows = Math.min(Math.max(config.logVisibleRows ?? 8, 3), 24);
  const lineHeightPx = 20;
  const consoleHeight = visibleRows * lineHeightPx + 28;

  useEffect(() => {
    if (editPreview) return;
    const load = () => {
      const categories = config.logCategories?.filter(Boolean) ?? [];
      const q =
        categories.length === 1
          ? `&category=${encodeURIComponent(categories[0])}`
          : "";
      fetch(`/api/system/logs?limit=${limit}${q}`)
        .then((r) => r.json())
        .then((rows) => (Array.isArray(rows) ? setLogs(rows) : setLogs([])))
        .catch(() => setLogs([]));
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [limit, config.logCategories, editPreview]);

  useEffect(() => {
    if (editPreview || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, editPreview]);

  const bodyClass = getBodyFontClass(appearance?.fontSize);
  const displayLogs = [...logs].reverse();

  const previewLines = [
    { category: "system", message: "User signed in", time: "12:01:04" },
    { category: "relay", message: 'Relay "Porch light" set to ON', time: "12:01:12" },
    { category: "mqtt", message: "Relay state porch · light: ON", time: "12:01:13" },
    { category: "dashboard", message: "Widget added: sensor", time: "12:02:01" },
  ];

  return (
    <Shell
      appearance={appearance}
      editPreview={editPreview}
      fit={false}
      className={cn("h-full min-h-0 items-stretch justify-start text-left", className)}
    >
      {title ? <WidgetTitleBar title={title} /> : null}
      <div
        className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border/70 bg-muted/40 font-mono shadow-inner"
        style={{ height: consoleHeight, maxHeight: consoleHeight }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
          <span>activity console</span>
          <span>{visibleRows} lines · scroll for more</span>
        </div>
        <div
          ref={scrollRef}
          className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-1.5", bodyClass)}
        >
          {editPreview ? (
            previewLines.map((line, i) => (
              <ActivityLogLine key={i} category={line.category} message={line.message} time={line.time} />
            ))
          ) : displayLogs.length === 0 ? (
            <p className="text-muted-foreground">No activity logged yet.</p>
          ) : (
            displayLogs.map((log) => (
              <ActivityLogLine
                key={log.id}
                category={log.category}
                message={log.message}
                time={formatLogTime(log.createdAt)}
              />
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}

function formatLogTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

const LOG_CATEGORY_CLASS: Record<string, string> = {
  dashboard: "text-primary",
  relay: "text-amber-600 dark:text-amber-400",
  mqtt: "text-emerald-600 dark:text-emerald-400",
  system: "text-violet-600 dark:text-violet-400",
  device: "text-sky-600 dark:text-sky-400",
};

function ActivityLogLine({
  category,
  message,
  time,
}: {
  category: string;
  message: string;
  time: string;
}) {
  const catClass = LOG_CATEGORY_CLASS[category] || "text-muted-foreground";
  return (
    <div
      className="flex gap-2 whitespace-pre-wrap break-words leading-5"
      style={{ minHeight: 20 }}
    >
      <span className="shrink-0 tabular-nums text-muted-foreground/80">[{time}]</span>
      <span className={cn("shrink-0 uppercase", catClass)}>[{category}]</span>
      <span className="min-w-0 text-foreground/90">{message}</span>
    </div>
  );
}

export function NetworkStatusWidget({
  appearance,
  title,
  rowSpan = 1,
  editPreview,
}: {
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  rowSpan?: number;
  editPreview?: boolean;
}) {
  const [data, setData] = useState<{
    server?: { hostname?: string; addresses?: string[] };
    devices?: {
      name: string;
      ipAddress: string | null;
      isOnline: boolean;
      roomName: string | null;
    }[];
  } | null>(null);

  useEffect(() => {
    if (editPreview) return;
    fetch("/api/system/network")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
    const id = setInterval(() => {
      fetch("/api/system/network")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 20_000);
    return () => clearInterval(id);
  }, [editPreview]);

  const bodyClass = getBodyFontClass(appearance?.fontSize);

  if (editPreview) {
    return (
      <Shell appearance={appearance} editPreview>
        <p className={cn("font-semibold", getTitleFontClass(appearance?.fontSize))}>
          {title || "Network"}
        </p>
        <p className={cn("mt-2 text-muted-foreground", bodyClass)}>Server IP and ESP32 devices</p>
      </Shell>
    );
  }

  return (
    <Shell appearance={appearance} fit={false} className="flex h-full flex-col">
      {title ? <WidgetTitleBar title={title} /> : null}
      <div className={cn("flex w-full min-h-0 flex-1 flex-col", rowSpan > 1 && "justify-center")}>
      <section
        className={cn(
          "mb-1 w-full shrink-0",
          appearance?.fontSize ? bodyClass : WIDGET_FIT_BODY
        )}
      >
        <p className="font-medium text-foreground">Server</p>
        <p className="truncate text-muted-foreground">{data?.server?.hostname}</p>
        <p className="truncate font-mono text-foreground">
          {(data?.server?.addresses || []).join(" · ") || "—"}
        </p>
      </section>
      <section
        className={cn(
          "w-full min-h-0 overflow-hidden",
          appearance?.fontSize ? bodyClass : WIDGET_FIT_BODY,
          WIDGET_SHOW_WHEN_TALL
        )}
      >
        <p className="mb-1 font-medium text-foreground">Devices</p>
        <ul className="space-y-1 overflow-hidden">
          {(data?.devices || []).map((d) => (
            <li
              key={d.name}
              className="flex items-start justify-between gap-2 rounded border border-border/50 px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{d.name}</p>
                <p className="text-muted-foreground">{d.roomName || "Unassigned"}</p>
                <p className="font-mono text-xs">{d.ipAddress || "No IP"}</p>
              </div>
              <span className={d.isOnline ? "badge-online shrink-0" : "badge-offline shrink-0"}>
                {d.isOnline ? "Online" : "Offline"}
              </span>
            </li>
          ))}
          {(data?.devices || []).length === 0 && (
            <li className="text-muted-foreground">No devices registered.</li>
          )}
        </ul>
      </section>
      </div>
    </Shell>
  );
}

function formatTestAge(iso: string | null): string {
  if (!iso) return "Never";
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs < 60_000) return "just now";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function SpeedTestWidget({
  config,
  appearance,
  title,
  editPreview,
}: {
  config: WidgetConfig;
  appearance?: WidgetAppearanceConfig;
  title?: string | null;
  rowSpan?: number;
  colSpan?: number;
  editPreview?: boolean;
}) {
  const interval = config.speedTestIntervalMinutes ?? 3;
  const gaugePlatform = savedGaugePlatform(config);
  const [data, setData] = useState<{
    status?: string;
    internalIp?: string | null;
    externalIp?: string | null;
    downloadMbps?: number | null;
    uploadMbps?: number | null;
    latencyMs?: number | null;
    testedAt?: string | null;
    error?: string;
    intervalMinutes?: number;
  } | null>(null);

  useEffect(() => {
    if (editPreview) return;
    const load = () => {
      fetch(`/api/system/speedtest?intervalMinutes=${interval}`)
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData(null));
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [editPreview, interval]);

  const isRunning = data?.status === "running";
  const statusLabel = isRunning ? "…" : data?.status === "error" ? "!" : "●";

  const internalIp = editPreview ? "192.168.1.10" : data?.internalIp || "—";
  const externalIp = editPreview ? "203.0.113.42" : data?.externalIp || "—";
  const downloadMbps = editPreview ? 94.2 : (data?.downloadMbps ?? null);

  function renderDownloadGauge() {
    if (gaugePlatform) {
      return (
        <SpeedTestDial
          label="Download"
          valueMbps={downloadMbps}
          platform={gaugePlatform}
          showLabel={false}
        />
      );
    }
    return <NetworkSpeedGauge label="Download" valueMbps={downloadMbps} />;
  }

  const ipRow = (
    <p className="speed-test-ip-row shrink-0 truncate text-center font-mono text-[8px] leading-tight text-foreground sm:text-[9px]">
      <span className="text-muted-foreground">LAN </span>
      {internalIp}
      <span className="mx-0.5 text-muted-foreground" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground">WAN </span>
      {externalIp}
      {!editPreview ? (
        <span
          className={cn(
            "speed-test-status ml-0.5 inline text-[8px] leading-none",
            isRunning
              ? "text-amber-600"
              : data?.status === "error"
                ? "text-destructive"
                : "text-emerald-600"
          )}
          title={isRunning ? "Testing" : data?.status === "error" ? "Error" : "OK"}
        >
          {statusLabel}
        </span>
      ) : null}
    </p>
  );

  const metaParts: string[] = [];
  if (!editPreview) {
    if (data?.latencyMs != null) metaParts.push(`${data.latencyMs} ms`);
    const age = formatTestAge(data?.testedAt ?? null);
    if (age) metaParts.push(age);
    metaParts.push(`every ${data?.intervalMinutes ?? interval} min`);
  }

  const footer = (
    <div className="speed-test-footer-block flex shrink-0 flex-col gap-0.5">
      {ipRow}
      {!editPreview && !gaugePlatform && metaParts.length > 0 ? (
        <p className="speed-test-footer shrink-0 truncate text-center text-[7px] leading-tight text-muted-foreground">
          {metaParts.join(" · ")}
        </p>
      ) : null}
      {!editPreview && data?.error ? (
        <p className="shrink-0 truncate text-center text-[7px] leading-tight text-destructive">
          {data.error}
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        appearance
          ? getWidgetShellClasses(appearance, editPreview)
          : "card flex h-full min-h-0 w-full flex-col overflow-hidden text-left",
        "gap-0"
      )}
    >
      {title ? <WidgetTitleBar title={title} /> : null}

      <div className={cn(WIDGET_FIT_GAUGE, "speed-test-platform-body min-h-0 flex-1")}>
        <div
          className={cn(
            "speed-test-gauges min-h-0",
            gaugePlatform && "speed-test-gauges--platform"
          )}
        >
          {renderDownloadGauge()}
        </div>
      </div>

      {footer}
    </div>
  );
}
