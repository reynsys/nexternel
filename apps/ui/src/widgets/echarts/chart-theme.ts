import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

/** Colours derived from System → Appearance (MUI theme). */
export type EchartsThemePalette = {
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  splitLine: string;
  background: string;
  isDark: boolean;
};

const MUTED_PRESET_COLORS = new Set([
  "#999",
  "#666",
  "#464646",
  "#555",
  "#333",
  "#000",
]);

function shouldReplaceMutedColor(color: unknown): boolean {
  if (typeof color !== "string") return false;
  if (color === "inherit" || color === "auto") return false;
  return MUTED_PRESET_COLORS.has(color.toLowerCase());
}

export function echartsPaletteFromTheme(theme: Theme): EchartsThemePalette {
  const mode = theme.palette.mode;
  const accent = theme.palette.primary.main;
  return {
    accent,
    accentSoft: alpha(accent, mode === "dark" ? 0.45 : 0.35),
    textPrimary: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    textMuted: alpha(theme.palette.text.primary, mode === "dark" ? 0.65 : 0.55),
    splitLine: alpha(theme.palette.text.primary, mode === "dark" ? 0.22 : 0.18),
    background: theme.palette.background.paper,
    isDark: mode === "dark",
  };
}

function patchLineStyle(
  lineStyle: unknown,
  palette: EchartsThemePalette,
  useSplit = true
): void {
  if (!lineStyle || typeof lineStyle !== "object" || Array.isArray(lineStyle)) return;
  const ls = lineStyle as Record<string, unknown>;
  if (!ls.color || shouldReplaceMutedColor(ls.color)) {
    ls.color = useSplit ? palette.splitLine : palette.textMuted;
  }
}

function patchAxisLabel(axisLabel: unknown, palette: EchartsThemePalette): void {
  if (!axisLabel || typeof axisLabel !== "object" || Array.isArray(axisLabel)) return;
  const al = axisLabel as Record<string, unknown>;
  if (al.show === false) return;
  if (!al.color || shouldReplaceMutedColor(al.color)) {
    al.color = palette.textMuted;
  }
}

function patchAxis(axis: unknown, palette: EchartsThemePalette): void {
  if (!axis || typeof axis !== "object" || Array.isArray(axis)) return;
  const a = axis as Record<string, unknown>;
  patchAxisLabel(a.axisLabel, palette);
  const splitLine = a.splitLine;
  if (splitLine && typeof splitLine === "object" && !Array.isArray(splitLine)) {
    const sl = splitLine as Record<string, unknown>;
    patchLineStyle(sl.lineStyle, palette, true);
  }
  const axisTick = a.axisTick;
  if (axisTick && typeof axisTick === "object" && !Array.isArray(axisTick)) {
    const at = axisTick as Record<string, unknown>;
    patchLineStyle(at.lineStyle, palette, true);
  }
}

function patchTextStyle(textStyle: unknown, palette: EchartsThemePalette): void {
  if (!textStyle || typeof textStyle !== "object" || Array.isArray(textStyle)) return;
  const ts = textStyle as Record<string, unknown>;
  if (!ts.color || shouldReplaceMutedColor(ts.color)) {
    ts.color = palette.textPrimary;
  }
}

function patchGaugeSeries(series: Record<string, unknown>, palette: EchartsThemePalette): void {
  patchAxisLabel(series.axisLabel, palette);
  const splitLine = series.splitLine;
  if (splitLine && typeof splitLine === "object" && !Array.isArray(splitLine)) {
    patchLineStyle((splitLine as Record<string, unknown>).lineStyle, palette, true);
  }
  const axisTick = series.axisTick;
  if (axisTick && typeof axisTick === "object" && !Array.isArray(axisTick)) {
    patchLineStyle((axisTick as Record<string, unknown>).lineStyle, palette, true);
  }
  const detail = series.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const d = detail as Record<string, unknown>;
    if (!d.color || shouldReplaceMutedColor(d.color)) {
      d.color = palette.textPrimary;
    }
  }
  const title = series.title;
  if (title && typeof title === "object" && !Array.isArray(title)) {
    const t = title as Record<string, unknown>;
    if (!t.color || shouldReplaceMutedColor(t.color)) {
      t.color = palette.textMuted;
    }
  }
  const anchor = series.anchor;
  if (anchor && typeof anchor === "object" && !Array.isArray(anchor)) {
    const an = anchor as Record<string, unknown>;
    const itemStyle = an.itemStyle;
    if (itemStyle && typeof itemStyle === "object" && !Array.isArray(itemStyle)) {
      const is = itemStyle as Record<string, unknown>;
      if (shouldReplaceMutedColor(is.borderColor)) {
        is.borderColor = palette.splitLine;
      }
    }
  }
}

function patchAxes(axes: unknown, palette: EchartsThemePalette): void {
  if (Array.isArray(axes)) {
    for (const axis of axes) patchAxis(axis, palette);
    return;
  }
  patchAxis(axes, palette);
}

/**
 * Replace Apache demo greys/blacks with Appearance-aware colours so labels
 * stay readable on light/dark dashboards and gradients.
 */
export function applyEchartsPalette(
  option: Record<string, unknown>,
  palette: EchartsThemePalette | undefined
): Record<string, unknown> {
  if (!palette) return option;

  const out = { ...option };

  const title = out.title;
  if (title && typeof title === "object" && !Array.isArray(title)) {
    const t = title as Record<string, unknown>;
    patchTextStyle(t.textStyle, palette);
    patchTextStyle(t.subtextStyle, palette);
  }

  if (!out.textStyle || typeof out.textStyle !== "object" || Array.isArray(out.textStyle)) {
    out.textStyle = { color: palette.textPrimary };
  } else {
    patchTextStyle(out.textStyle, palette);
  }

  patchAxes(out.xAxis, palette);
  patchAxes(out.yAxis, palette);

  const series = out.series;
  if (Array.isArray(series)) {
    out.series = series.map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
      const s = { ...(raw as Record<string, unknown>) };
      if (s.type === "gauge") patchGaugeSeries(s, palette);
      return s;
    });
  }

  return out;
}
