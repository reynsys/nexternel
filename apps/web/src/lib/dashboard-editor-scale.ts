/** Column label track in the edit-dashboard grid (`2.5rem`). */
export const EDITOR_GRID_LABEL_COL_PX = 40;

const MIN_WIDGET_SCALE = 0.45;
const MAX_WIDGET_SCALE = 1;

export function gridGapPx(): number {
  if (typeof window === "undefined") return 12;
  return window.innerWidth >= 768 ? 12 : 8;
}

export function dataRowHeightPx(
  containerHeight: number,
  rows: number,
  headerRowPx = 0
): number {
  if (rows < 1 || containerHeight < 1) return 0;
  const gap = gridGapPx();
  return Math.max(40, Math.floor((containerHeight - headerRowPx - gap * rows) / rows));
}

/** Live dashboard data-row height from viewport (matches useDashboardGridFit). */
export function viewDashboardDataRowHeightPx(rows: number): number {
  if (typeof window === "undefined") return 160;
  const pad = window.innerWidth >= 768 ? 48 : 32;
  const availH = Math.max(240, window.innerHeight - 56 - pad);
  return dataRowHeightPx(availH, rows, 0);
}

export function dataColumnWidthPx(
  gridWidth: number,
  columns: number,
  labelColPx: number
): number {
  if (columns < 1 || gridWidth < 1) return 0;
  const gap = gridGapPx();
  if (labelColPx > 0) {
    return (gridWidth - labelColPx - gap * columns) / columns;
  }
  return (gridWidth - gap * Math.max(0, columns - 1)) / columns;
}

function spanExtentPx(span: number, unitPx: number, gap: number): number {
  if (span < 1 || unitPx < 1) return 0;
  return span * unitPx + Math.max(0, span - 1) * gap;
}

export function widgetContentScale({
  colSpan,
  rowSpan,
  columns,
  editorRowPx,
  editorGridWidthPx,
  viewRowPx,
  viewGridWidthPx,
}: {
  colSpan: number;
  rowSpan: number;
  columns: number;
  editorRowPx: number;
  editorGridWidthPx: number;
  viewRowPx: number;
  viewGridWidthPx: number;
}): number {
  const gap = gridGapPx();
  const editorColPx = dataColumnWidthPx(editorGridWidthPx, columns, EDITOR_GRID_LABEL_COL_PX);
  const viewColPx = dataColumnWidthPx(viewGridWidthPx, columns, 0);

  if (editorColPx < 1 || viewColPx < 1 || editorRowPx < 1 || viewRowPx < 1) {
    return MAX_WIDGET_SCALE;
  }

  const scaleX =
    spanExtentPx(colSpan, editorColPx, gap) / spanExtentPx(colSpan, viewColPx, gap);
  const scaleY =
    spanExtentPx(rowSpan, editorRowPx, gap) / spanExtentPx(rowSpan, viewRowPx, gap);

  const scale = Math.min(scaleX, scaleY);
  if (!Number.isFinite(scale) || scale <= 0) return MAX_WIDGET_SCALE;
  return Math.max(MIN_WIDGET_SCALE, Math.min(MAX_WIDGET_SCALE, scale));
}
