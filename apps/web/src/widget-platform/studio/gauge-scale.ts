/** Dashboard grid cell size for studio preview (widget frame — not zoomed). */
export function gridWidgetFramePx(widget: { colSpan: number; rowSpan: number }): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(200, widget.colSpan * 140),
    height: Math.max(160, widget.rowSpan * 120),
  };
}
