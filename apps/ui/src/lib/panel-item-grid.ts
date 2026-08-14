import type { SxProps, Theme } from "@mui/material/styles";
import type { PanelAppearanceLayout } from "./panel-appearance";

export type { PanelAppearanceLayout };

/** Row height policy for multi-item panel grids. */
export type PanelItemGridRowSize = "fluid" | "compact" | "standard" | "tall";

const MIN_COL: Record<PanelAppearanceLayout, string> = {
  compact: "7rem",
  grid: "8rem",
  card: "9rem",
};

const MAX_COLS: Record<PanelAppearanceLayout, number> = {
  compact: 2,
  card: 3,
  grid: 4,
};

const ROW_MIN: Record<PanelItemGridRowSize, string> = {
  fluid: "0",
  compact: "4rem",
  standard: "4.5rem",
  tall: "5rem",
};

/**
 * Column count follows how many items exist (capped by layout), not how wide the tile is.
 * One switch → one full-width column; four switches → up to layout max columns.
 */
export function panelItemGridColumns(
  layout: PanelAppearanceLayout = "card",
  itemCount: number
): string {
  if (itemCount <= 0) return "1fr";
  const cols = Math.min(Math.max(1, itemCount), MAX_COLS[layout]);
  return `repeat(${cols}, minmax(0, 1fr))`;
}

export function panelItemGridGap(layout: PanelAppearanceLayout = "card"): number {
  return layout === "compact" ? 1 : 1.5;
}

export function panelItemGridSx(opts: {
  layout?: PanelAppearanceLayout;
  rowSize?: PanelItemGridRowSize;
  itemCount: number;
}): SxProps<Theme> {
  const layout = opts.layout ?? "card";
  const rowSize = opts.rowSize ?? "standard";
  const rowMin = ROW_MIN[rowSize];
  return {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: panelItemGridColumns(layout, opts.itemCount),
    gridAutoRows: rowMin === "0" ? "minmax(0, 1fr)" : `minmax(${rowMin}, 1fr)`,
    gap: panelItemGridGap(layout),
    overflow: "auto",
    alignContent: "stretch",
    alignItems: "stretch",
    "& > *": {
      minWidth: 0,
      minHeight: 0,
      width: "100%",
      height: "100%",
    },
  };
}

/** @deprecated used only for docs — min column width reference */
export const PANEL_ITEM_MIN_COL = MIN_COL;
