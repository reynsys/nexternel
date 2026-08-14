import { useEffect, useRef, useState } from "react";
import type { WidgetContribution } from "@nexternel/plugin-sdk";
import { CLOCK_WIDGET_TYPE, clockPluginManifest } from "./manifest";

export { CLOCK_WIDGET_TYPE, clockPluginManifest } from "./manifest";

export type ClockDigitalStyle = "standard" | "mono" | "bold";
export type ClockAnalogStyle = "classic" | "minimal" | "roman";
export type ClockTimeMode = "digital" | "analog";

export type ClockWidgetConfig = {
  timeMode?: ClockTimeMode;
  digitalStyle?: ClockDigitalStyle;
  analogStyle?: ClockAnalogStyle;
  showSeconds?: boolean;
  showDate?: boolean;
  /** true = 12h, false = 24h, omit = locale default */
  hour12?: boolean;
  /** Extra scale 0.6–1.4 (default 1) */
  fontScale?: number;
};

type WidgetLike = {
  title?: string;
  config?: Record<string, unknown>;
};

function parseConfig(raw: Record<string, unknown> | undefined): Required<
  Pick<
    ClockWidgetConfig,
    "timeMode" | "digitalStyle" | "analogStyle" | "showSeconds" | "showDate" | "fontScale"
  >
> &
  Pick<ClockWidgetConfig, "hour12"> {
  const timeMode = raw?.timeMode === "analog" ? "analog" : "digital";
  const digitalStyle =
    raw?.digitalStyle === "mono" || raw?.digitalStyle === "bold"
      ? raw.digitalStyle
      : "standard";
  const analogStyle =
    raw?.analogStyle === "minimal" || raw?.analogStyle === "roman"
      ? raw.analogStyle
      : "classic";
  const showSeconds = raw?.showSeconds !== false;
  const showDate = raw?.showDate !== false;
  const fontScale =
    typeof raw?.fontScale === "number" && Number.isFinite(raw.fontScale)
      ? Math.min(1.4, Math.max(0.6, raw.fontScale))
      : 1;
  const hour12 =
    typeof raw?.hour12 === "boolean" ? raw.hour12 : undefined;
  return { timeMode, digitalStyle, analogStyle, showSeconds, showDate, fontScale, hour12 };
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

function AnalogClock({
  now,
  style,
}: {
  now: Date;
  style: ClockAnalogStyle;
}) {
  const { ref, w, h } = useBoxSize();
  const size = Math.max(40, Math.floor(Math.min(w, h)));

  const hours = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hourDeg = hours * 30 + m * 0.5;
  const minuteDeg = m * 6;
  const secondDeg = s * 6;

  const roman = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  const tickOuter = style === "minimal" ? 50 : 48;
  const tickInner = 52;
  const strokeW = style === "minimal" ? 1 : 2;
  const faceStroke = style === "roman" ? 3 : 2;

  return (
    <div ref={ref} style={{ width: "100%", height: "100%", minHeight: 0, minWidth: 0 }}>
      {size > 0 && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          style={{ display: "block", margin: "0 auto", maxWidth: "100%", maxHeight: "100%" }}
        >
          <circle
            cx="60"
            cy="60"
            r="56"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.35}
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
                stroke="currentColor"
                strokeOpacity={0.55}
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
                  fill="currentColor"
                  fillOpacity={0.7}
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
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              transform={`rotate(${secondDeg} 60 60)`}
            />
          )}
          <circle cx="60" cy="60" r="3" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

function DigitalClock({
  now,
  style,
  showSeconds,
  showDate,
  hour12,
  fontScale,
}: {
  now: Date;
  style: ClockDigitalStyle;
  showSeconds: boolean;
  showDate: boolean;
  hour12?: boolean;
  fontScale: number;
}) {
  const { ref, w, h } = useBoxSize();
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12,
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: style === "bold" ? "short" : "long",
    day: "numeric",
    month: style === "bold" ? "short" : "long",
  });

  const chars = Math.max(timeStr.length, 5);
  const dateBudget = showDate ? 0.72 : 0.9;
  const byWidth = w > 0 ? (w * 0.92) / (chars * 0.62) : 28;
  const byHeight = h > 0 ? h * dateBudget * 0.7 : 28;
  const timePx = Math.max(18, Math.min(byWidth, byHeight) * fontScale);
  const datePx = Math.max(10, Math.min(timePx * 0.28, h * 0.14));

  const fontFamily =
    style === "mono"
      ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
      : style === "bold"
        ? "system-ui, Segoe UI, Roboto, sans-serif"
        : "inherit";
  const fontWeight = style === "bold" ? 900 : style === "mono" ? 600 : 700;
  const letterSpacing = style === "mono" ? "0.08em" : style === "bold" ? "-0.02em" : "0.02em";

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
        padding: 4,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: timePx,
          fontWeight,
          fontFamily,
          letterSpacing,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          textTransform: style === "bold" ? "uppercase" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        {timeStr}
      </div>
      {showDate && (
        <div
          style={{
            marginTop: Math.max(4, timePx * 0.08),
            fontSize: datePx,
            opacity: 0.7,
            fontWeight: style === "bold" ? 600 : 400,
            letterSpacing: style === "bold" ? "0.06em" : undefined,
            textTransform: style === "bold" ? "uppercase" : undefined,
            lineHeight: 1.2,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {dateStr}
        </div>
      )}
    </div>
  );
}

export function ClockWidget({
  widget,
  showBodyHeading = true,
}: {
  widget?: WidgetLike;
  capabilities?: unknown;
  editMode?: boolean;
  showBodyHeading?: boolean;
}) {
  const cfg = parseConfig(widget?.config);
  const now = useNow(cfg.showSeconds && cfg.timeMode === "digital" ? 1000 : 1000);
  const title = widget?.title?.trim();
  const showChromeTitle =
    showBodyHeading &&
    Boolean(title && title !== "Clock" && title !== CLOCK_WIDGET_TYPE);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {showChromeTitle && (
        <div
          style={{
            flexShrink: 0,
            fontSize: "0.8rem",
            fontWeight: 600,
            opacity: 0.9,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        {cfg.timeMode === "analog" ? (
          <AnalogClock now={now} style={cfg.analogStyle} />
        ) : (
          <DigitalClock
            now={now}
            style={cfg.digitalStyle}
            showSeconds={cfg.showSeconds}
            showDate={cfg.showDate}
            hour12={cfg.hour12}
            fontScale={cfg.fontScale}
          />
        )}
      </div>
    </div>
  );
}

export const clockWidgetContribution: WidgetContribution = {
  type: CLOCK_WIDGET_TYPE,
  label: "Clock",
  category: "system",
  needsCapability: false,
  Component: ClockWidget,
};
