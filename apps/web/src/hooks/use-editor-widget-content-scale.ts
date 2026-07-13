"use client";

import { useCallback, useEffect, useState } from "react";
import {
  viewDashboardDataRowHeightPx,
  widgetContentScale,
} from "@/lib/dashboard-editor-scale";

export function useEditorWidgetContentScale(
  columns: number,
  rows: number,
  editorDataRowPx: number | undefined,
  editorGridEl: HTMLElement | null,
  enabled: boolean
): (colSpan: number, rowSpan: number) => number {
  const [viewGridWidthPx, setViewGridWidthPx] = useState(0);
  const viewRowPx = viewDashboardDataRowHeightPx(rows);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      const main = document.querySelector("main");
      setViewGridWidthPx(main?.clientWidth ?? 0);
    };

    update();
    const ro = editorGridEl ? new ResizeObserver(update) : null;
    if (editorGridEl && ro) ro.observe(editorGridEl);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [enabled, editorGridEl]);

  return useCallback(
    (colSpan: number, rowSpan: number) => {
      if (!enabled || !editorDataRowPx || !editorGridEl || viewGridWidthPx < 1) {
        return 1;
      }

      return widgetContentScale({
        colSpan,
        rowSpan,
        columns,
        editorRowPx: editorDataRowPx,
        editorGridWidthPx: editorGridEl.clientWidth,
        viewRowPx,
        viewGridWidthPx,
      });
    },
    [enabled, editorDataRowPx, editorGridEl, viewGridWidthPx, columns, viewRowPx]
  );
}
