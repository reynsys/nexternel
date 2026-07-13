"use client";

import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_GRID_ROW_VIEW } from "@/lib/dashboard-grid";

const VIEW_HEADER_PX = 56;
const VIEW_MAIN_PADDING_PX = { md: 48, default: 32 };

function viewGridGapPx(): number {
  if (typeof window === "undefined") return 12;
  return window.innerWidth >= 768 ? 12 : 8;
}

/** Same vertical space as the live home dashboard grid (header + main padding). */
export function mainDashboardGridAreaHeightPx(): number {
  if (typeof window === "undefined") return 640;
  const pad =
    window.innerWidth >= 768 ? VIEW_MAIN_PADDING_PX.md : VIEW_MAIN_PADDING_PX.default;
  return Math.max(240, window.innerHeight - VIEW_HEADER_PX - pad);
}

/** Edit dashboard grid — slightly shorter to leave room for editor chrome above the grid. */
export function editorDashboardGridAreaHeightPx(scale = 0.9): number {
  return Math.max(200, Math.floor(mainDashboardGridAreaHeightPx() * scale));
}

export type DashboardGridFitOptions = {
  /** Editor: fixed row for column labels (e.g. 1.75rem ≈ 28px). */
  headerRowPx?: number;
  minRowPx?: number;
  /** Editor: size grid area to match live dashboard height. */
  matchViewportGridHeight?: boolean;
  /** Scale when matchViewportGridHeight (editor chrome). Default 1. */
  viewportHeightScale?: number;
};

/**
 * Sizes grid rows to fill the container (no scroll inside grid).
 * Columns stay `1fr`. Recomputes on resize.
 */
export function useDashboardGridFit(
  rows: number,
  enabled: boolean,
  options: DashboardGridFitOptions = {}
): {
  containerRef: (node: HTMLDivElement | null) => void;
  rowTemplate: string;
  gridAreaHeightPx: number | undefined;
  dataRowHeightPx: number | undefined;
} {
  const headerRowPx = options.headerRowPx ?? 0;
  const minRowPx = options.minRowPx ?? 40;
  const matchViewport = options.matchViewportGridHeight ?? false;
  const viewportScale = options.viewportHeightScale ?? 1;

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [rowTemplate, setRowTemplate] = useState(
    `repeat(${Math.max(1, rows)}, ${DASHBOARD_GRID_ROW_VIEW})`
  );
  const [gridAreaHeightPx, setGridAreaHeightPx] = useState<number | undefined>(
    matchViewport ? editorDashboardGridAreaHeightPx(viewportScale) : undefined
  );
  const [dataRowHeightPx, setDataRowHeightPx] = useState<number | undefined>();

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  useEffect(() => {
    if (!enabled || rows < 1) return;

    const updateViewportHeight = () => {
      if (matchViewport) {
        setGridAreaHeightPx(editorDashboardGridAreaHeightPx(viewportScale));
      }
    };

    const updateRows = () => {
      if (!containerEl) return;
      const availH = containerEl.clientHeight;
      if (availH < 1) return;
      const gap = viewGridGapPx();
      const rowH = Math.max(
        minRowPx,
        Math.floor((availH - headerRowPx - gap * rows) / rows)
      );
      if (headerRowPx > 0) {
        setRowTemplate(`${headerRowPx}px repeat(${rows}, minmax(0, ${rowH}px))`);
      } else {
        setRowTemplate(`repeat(${rows}, minmax(0, ${rowH}px))`);
      }
      setDataRowHeightPx(rowH);
    };

    const update = () => {
      updateViewportHeight();
      updateRows();
    };

    update();
    const raf = requestAnimationFrame(update);
    const ro = containerEl ? new ResizeObserver(update) : null;
    if (containerEl && ro) ro.observe(containerEl);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [enabled, containerEl, rows, headerRowPx, minRowPx, matchViewport, viewportScale]);

  return { containerRef, rowTemplate, gridAreaHeightPx, dataRowHeightPx };
}

/** @deprecated Use useDashboardGridFit */
export const useDashboardViewGridFit = (
  rows: number,
  enabled: boolean
) => useDashboardGridFit(rows, enabled);
