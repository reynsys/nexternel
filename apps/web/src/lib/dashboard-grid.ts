/** Editor grid: row height is computed in DashboardGridEditor (near-square cells for previews). */
export const DASHBOARD_GRID_ROW_EDITOR = "minmax(9.5rem, 9.5rem)";

/** Live dashboard: rows share available viewport height (no page scroll). */
export const DASHBOARD_GRID_ROW_VIEW = "minmax(0, 1fr)";

/**
 * @deprecated Use viewport-fit row sizing in useDashboardViewGridFit (scale caused scroll).
 * Kept for reference when tuning cell proportions in edit mode later.
 */
export const DASHBOARD_VIEW_ROW_HEIGHT_SCALE = 1;

/** @deprecated use DASHBOARD_GRID_ROW_EDITOR */
export const DASHBOARD_GRID_ROW_CSS = DASHBOARD_GRID_ROW_EDITOR;

/** Named container for widget-fit CSS in globals.css — set on dashboard grid cells, not inner shells. */
export const WIDGET_CONTAINER_CLASS = "@container/widget";

/** Grid cell wrapper: single container-query context per widget. */
export const WIDGET_CELL_CLASS =
  "@container/widget dashboard-widget-cell flex h-full min-h-0 min-w-0 flex-col overflow-hidden";

/** Flex chain root inside a cell (WidgetContent). */
export const WIDGET_FIT_ROOT =
  "widget-fit-root flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden";

/** Flexible body that absorbs remaining cell height. */
export const WIDGET_FIT_BODY_REGION =
  "widget-fit-body-region flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden";

/** Scrollable body when lists exceed cell height. */
export const WIDGET_FIT_SCROLL_REGION =
  "widget-fit-body-region widget-fit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain";

/** Gauge / chart area — pairs with globals.css .widget-fit-gauge__* */
export const WIDGET_FIT_GAUGE = "widget-fit-gauge flex min-h-0 min-w-0 flex-1 flex-col";

export const WIDGET_FIT_INNER =
  "widget-fit-inner flex h-full w-full min-h-0 flex-col items-stretch justify-start text-left leading-tight";

export const WIDGET_FIT_INNER_CENTERED =
  "widget-fit-inner flex h-full w-full min-h-0 flex-col items-center justify-center text-center leading-tight";

export const WIDGET_FIT_VALUE = "widget-fit-value font-bold tabular-nums";

export const WIDGET_FIT_BODY = "widget-fit-body";

export const WIDGET_FIT_TITLE = "widget-fit-title font-semibold";

/** Hidden in short cells; shown via globals.css @container rules */
export const WIDGET_SHOW_WHEN_TALL = "widget-show-when-tall";

export const WIDGET_SHOW_WHEN_TALL_GRID = "widget-show-when-tall-grid";
