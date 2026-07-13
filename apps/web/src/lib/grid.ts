/** Excel-style cell addresses: A1 = column A (0), row 1 (index 0). */

export function columnIndexToLetter(index: number): string {
  let n = index;
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export function columnLetterToIndex(letters: string): number {
  const upper = letters.toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function parseCellAddress(cell: string): { col: number; row: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(cell.trim());
  if (!match) return null;
  const col = columnLetterToIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;
  if (col < 0 || row < 0) return null;
  return { col, row };
}

export function formatCellAddress(col: number, row: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`;
}

export function cellFitsGrid(
  cell: string,
  colSpan: number,
  rowSpan: number,
  columns: number,
  rows: number
): boolean {
  const pos = parseCellAddress(cell);
  if (!pos) return false;
  return (
    pos.col >= 0 &&
    pos.row >= 0 &&
    pos.col + colSpan <= columns &&
    pos.row + rowSpan <= rows
  );
}

export function columnLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => columnIndexToLetter(i));
}

export function rowLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

export interface GridRect {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export function rectFromWidget(cell: string, colSpan: number, rowSpan: number): GridRect | null {
  const pos = parseCellAddress(cell);
  if (!pos) return null;
  return { col: pos.col, row: pos.row, colSpan, rowSpan };
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return !(
    a.col + a.colSpan <= b.col ||
    b.col + b.colSpan <= a.col ||
    a.row + a.rowSpan <= b.row ||
    b.row + b.rowSpan <= a.row
  );
}

export function sortWidgetsByPosition<
  T extends { cell: string; colSpan: number; rowSpan: number },
>(widgets: T[]): T[] {
  return [...widgets].sort((a, b) => {
    const pa = parseCellAddress(a.cell);
    const pb = parseCellAddress(b.cell);
    if (!pa || !pb) return 0;
    if (pa.row !== pb.row) return pa.row - pb.row;
    return pa.col - pb.col;
  });
}

/** First grid slot (row-major) that fits colSpan×rowSpan without overlapping occupied rects. */
export function findNextFreeCell(
  colSpan: number,
  rowSpan: number,
  columns: number,
  rows: number,
  occupied: GridRect[]
): string | null {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (col + colSpan > columns || row + rowSpan > rows) continue;
      const candidate: GridRect = { col, row, colSpan, rowSpan };
      if (!occupied.some((o) => rectsOverlap(o, candidate))) {
        return formatCellAddress(col, row);
      }
    }
  }
  return null;
}

/** All anchor cells where a new widget of the given size fits without overlapping existing widgets. */
export function listAvailableCells(
  colSpan: number,
  rowSpan: number,
  columns: number,
  rows: number,
  widgets: { cell: string; colSpan: number; rowSpan: number }[]
): string[] {
  const occupied = widgets
    .map((w) => rectFromWidget(w.cell, w.colSpan, w.rowSpan))
    .filter((r): r is GridRect => r !== null);
  const cells: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (col + colSpan > columns || row + rowSpan > rows) continue;
      const candidate: GridRect = { col, row, colSpan, rowSpan };
      if (!occupied.some((o) => rectsOverlap(o, candidate))) {
        cells.push(formatCellAddress(col, row));
      }
    }
  }
  return cells;
}

/**
 * Place a new widget at the requested cell and repack overlapping widgets.
 * Falls back to the same behaviour as reflowOnInsertAtA1 when targetCell is A1.
 */
export function reflowOnInsertAtCell(
  columns: number,
  rows: number,
  existing: { id: string; cell: string; colSpan: number; rowSpan: number }[],
  newColSpan: number,
  newRowSpan: number,
  targetCell: string
): { newCell: string; updates: { id: string; cell: string }[] } | { error: string } {
  const cell = targetCell.toUpperCase();
  if (!cellFitsGrid(cell, newColSpan, newRowSpan, columns, rows)) {
    return { error: "Widget does not fit at that cell — check size or grid bounds." };
  }

  const origin = parseCellAddress(cell);
  if (!origin) return { error: "Invalid cell address." };

  const newRect: GridRect = {
    col: origin.col,
    row: origin.row,
    colSpan: newColSpan,
    rowSpan: newRowSpan,
  };
  const occupied: GridRect[] = [newRect];
  const updates: { id: string; cell: string }[] = [];

  for (const w of sortWidgetsByPosition(existing)) {
    const current = rectFromWidget(w.cell, w.colSpan, w.rowSpan);
    const overlaps = current ? rectsOverlap(current, newRect) : true;
    let nextCell = w.cell.toUpperCase();

    if (overlaps) {
      const free = findNextFreeCell(w.colSpan, w.rowSpan, columns, rows, occupied);
      if (!free) {
        return {
          error:
            "Dashboard grid is full at that cell — pick another cell, add rows/columns, or remove a widget.",
        };
      }
      nextCell = free;
    }

    if (nextCell !== w.cell.toUpperCase()) {
      updates.push({ id: w.id, cell: nextCell });
    }
    const placed = rectFromWidget(nextCell, w.colSpan, w.rowSpan);
    if (placed) occupied.push(placed);
  }

  return { newCell: cell, updates };
}

/**
 * Place a new widget at A1 and repack existing widgets into the next free cells.
 * Returns new cell for insert (always A1 when it fits) and cell updates for existing widgets.
 */
export function reflowOnInsertAtA1(
  columns: number,
  rows: number,
  existing: { id: string; cell: string; colSpan: number; rowSpan: number }[],
  newColSpan: number,
  newRowSpan: number
): { newCell: string; updates: { id: string; cell: string }[] } | { error: string } {
  if (!cellFitsGrid("A1", newColSpan, newRowSpan, columns, rows)) {
    return { error: "New widget does not fit at A1 — widen the grid or reduce widget size." };
  }

  const newRect: GridRect = { col: 0, row: 0, colSpan: newColSpan, rowSpan: newRowSpan };
  const occupied: GridRect[] = [newRect];
  const updates: { id: string; cell: string }[] = [];

  for (const w of sortWidgetsByPosition(existing)) {
    const cell = findNextFreeCell(w.colSpan, w.rowSpan, columns, rows, occupied);
    if (!cell) {
      return {
        error: "Dashboard grid is full — add rows/columns or remove a widget before adding another.",
      };
    }
    if (cell !== w.cell.toUpperCase()) {
      updates.push({ id: w.id, cell });
    }
    const placed = rectFromWidget(cell, w.colSpan, w.rowSpan);
    if (placed) occupied.push(placed);
  }

  return { newCell: "A1", updates };
}

/** Repack all widgets in place order into non-overlapping cells starting at A1. */
export function reflowAllWidgets(
  columns: number,
  rows: number,
  widgets: { id: string; cell: string; colSpan: number; rowSpan: number }[]
): { updates: { id: string; cell: string }[] } | { error: string } {
  const occupied: GridRect[] = [];
  const updates: { id: string; cell: string }[] = [];

  for (const w of sortWidgetsByPosition(widgets)) {
    const cell = findNextFreeCell(w.colSpan, w.rowSpan, columns, rows, occupied);
    if (!cell) {
      return { error: "Grid is too small for all widgets — add rows or columns." };
    }
    if (cell !== w.cell.toUpperCase()) {
      updates.push({ id: w.id, cell });
    }
    const placed = rectFromWidget(cell, w.colSpan, w.rowSpan);
    if (placed) occupied.push(placed);
  }

  return { updates };
}

export function isCellOccupied(
  col: number,
  row: number,
  widgets: { cell: string; colSpan: number; rowSpan: number }[]
): boolean {
  return widgets.some((w) => {
    const origin = parseCellAddress(w.cell);
    if (!origin) return false;
    return (
      col >= origin.col &&
      col < origin.col + w.colSpan &&
      row >= origin.row &&
      row < origin.row + w.rowSpan
    );
  });
}

export function widgetAtCellOrigin<
  T extends { cell: string; colSpan: number; rowSpan: number },
>(col: number, row: number, widgets: T[]): T | undefined {
  return widgets.find((w) => {
    const origin = parseCellAddress(w.cell);
    return origin?.col === col && origin?.row === row;
  });
}

/** Repack widgets while keeping one widget pinned at a specific cell/size. */
export function reflowWithPinnedWidget(
  columns: number,
  rows: number,
  widgets: { id: string; cell: string; colSpan: number; rowSpan: number }[],
  pinnedId: string,
  pinnedCell: string,
  pinnedColSpan: number,
  pinnedRowSpan: number
): { updates: { id: string; cell: string }[] } | { error: string } {
  const cell = pinnedCell.toUpperCase();
  if (!cellFitsGrid(cell, pinnedColSpan, pinnedRowSpan, columns, rows)) {
    return { error: "Widget does not fit in grid at that cell." };
  }

  const origin = parseCellAddress(cell);
  if (!origin) return { error: "Invalid cell address." };

  const pinnedRect: GridRect = {
    col: origin.col,
    row: origin.row,
    colSpan: pinnedColSpan,
    rowSpan: pinnedRowSpan,
  };
  const occupied: GridRect[] = [pinnedRect];
  const updates: { id: string; cell: string }[] = [];

  const pinned = widgets.find((w) => w.id === pinnedId);
  if (!pinned) return { error: "Widget not found." };
  if (pinned.cell.toUpperCase() !== cell) {
    updates.push({ id: pinnedId, cell });
  }

  for (const w of sortWidgetsByPosition(widgets.filter((x) => x.id !== pinnedId))) {
    const currentRect = rectFromWidget(w.cell, w.colSpan, w.rowSpan);
    const needsMove = !currentRect || occupied.some((o) => rectsOverlap(o, currentRect));

    let nextCell = w.cell.toUpperCase();
    if (needsMove) {
      const free = findNextFreeCell(w.colSpan, w.rowSpan, columns, rows, occupied);
      if (!free) {
        return {
          error: "Grid is too small — add rows/columns, reduce widget size, or pick another cell.",
        };
      }
      nextCell = free;
    }

    if (nextCell !== w.cell.toUpperCase()) {
      updates.push({ id: w.id, cell: nextCell });
    }
    const placed = rectFromWidget(nextCell, w.colSpan, w.rowSpan);
    if (placed) occupied.push(placed);
  }

  return { updates };
}

export function detectOverlappingWidgetIds(
  widgets: { id: string; cell: string; colSpan: number; rowSpan: number }[]
): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < widgets.length; i++) {
    const a = rectFromWidget(widgets[i].cell, widgets[i].colSpan, widgets[i].rowSpan);
    if (!a) continue;
    for (let j = i + 1; j < widgets.length; j++) {
      const b = rectFromWidget(widgets[j].cell, widgets[j].colSpan, widgets[j].rowSpan);
      if (b && rectsOverlap(a, b)) {
        overlapping.add(widgets[i].id);
        overlapping.add(widgets[j].id);
      }
    }
  }
  return overlapping;
}

export function widgetOverlapsAny(
  cell: string,
  colSpan: number,
  rowSpan: number,
  others: { id: string; cell: string; colSpan: number; rowSpan: number }[],
  exceptId?: string
): boolean {
  const rect = rectFromWidget(cell, colSpan, rowSpan);
  if (!rect) return true;
  return others.some((w) => {
    if (exceptId && w.id === exceptId) return false;
    const other = rectFromWidget(w.cell, w.colSpan, w.rowSpan);
    return other ? rectsOverlap(rect, other) : false;
  });
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export function widgetToGridItem(widget: {
  id: string;
  cell: string;
  colSpan: number;
  rowSpan: number;
}): GridLayoutItem | null {
  const pos = parseCellAddress(widget.cell);
  if (!pos) return null;
  return {
    i: widget.id,
    x: pos.col,
    y: pos.row,
    w: widget.colSpan,
    h: widget.rowSpan,
    minW: 1,
    minH: 1,
  };
}

export function gridItemToPlacement(item: { x: number; y: number; w: number; h: number }) {
  return {
    cell: formatCellAddress(item.x, item.y),
    colSpan: item.w,
    rowSpan: item.h,
  };
}
