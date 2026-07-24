import { useEffect, useRef, useState } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneIcon from "@mui/icons-material/Tune";
import type { Capability, WidgetInstance } from "../api";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { CoreWidgetEditor } from "../widgets/CoreWidgetEditor";
import { EChartsWidgetEditor, isEchartsWidgetType } from "../widgets/echarts";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type Props = {
  sectionId: string;
  widgets: WidgetInstance[];
  capabilities: Capability[];
  editMode: boolean;
  onLayoutChange: (sectionId: string, next: Layout[]) => void;
  onRemoveWidget: (sectionId: string, widgetId: string) => void;
  onUpdateWidget: (sectionId: string, widgetId: string, patch: Partial<WidgetInstance>) => void;
};

function isCoreEditable(type: string): boolean {
  return type === "switch" || type === "stat";
}

/**
 * RGL inside accordion/collapse needs measured width — WidthProvider often stays at 0.
 */
export function SectionGrid({
  sectionId,
  widgets,
  capabilities,
  editMode,
  onLayoutChange,
  onRemoveWidget,
  onUpdateWidget,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [editWidgetId, setEditWidgetId] = useState<string | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.floor(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: w.layout.minW ?? 2,
    minH: w.layout.minH ?? 2,
  }));

  const editing = editWidgetId
    ? widgets.find((w) => w.id === editWidgetId) ?? null
    : null;
  const editingEcharts = editing ? isEchartsWidgetType(editing.type) : false;
  const editingCore = editing ? isCoreEditable(editing.type) : false;

  return (
    <Box
      ref={hostRef}
      sx={{
        width: "100%",
        minHeight: widgets.length ? 160 : 72,
        borderRadius: 2,
        p: editMode ? 1.5 : 0.5,
        bgcolor: (t) =>
          editMode
            ? t.palette.mode === "dark"
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)"
            : "transparent",
        outline: editMode ? "1px dashed" : "none",
        outlineColor: "divider",
      }}
    >
      {editMode && widgets.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Drag the handle to move · resize from the corner · Edit changes binding / title
        </Typography>
      )}
      {width > 0 && widgets.length > 0 && (
        <GridLayout
          className="layout"
          width={width}
          layout={layout}
          cols={12}
          rowHeight={56}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          isDraggable={editMode}
          isResizable={editMode}
          compactType="vertical"
          preventCollision={false}
          draggableHandle=".widget-drag-handle"
          onLayoutChange={(next) => {
            if (!editMode) return;
            if (next.length === 0 && widgets.length > 0) return;
            onLayoutChange(sectionId, next);
          }}
          resizeHandles={["se"]}
        >
          {widgets.map((w) => {
            const echarts = isEchartsWidgetType(w.type);
            const core = isCoreEditable(w.type);
            const canEdit = echarts || core;
            return (
              <div key={w.id}>
                <Paper
                  elevation={editMode ? 2 : 0}
                  variant={editMode ? "elevation" : "outlined"}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  {editMode && (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{
                        px: 0.5,
                        py: 0.25,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: (t) =>
                          t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "grey.50",
                      }}
                    >
                      <IconButton
                        size="small"
                        className="widget-drag-handle"
                        aria-label="Drag widget"
                        sx={{ cursor: "grab", touchAction: "none" }}
                      >
                        <DragIndicatorIcon fontSize="small" />
                      </IconButton>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flex: 1 }}
                        noWrap
                      >
                        {echarts ? "ECharts" : w.type === "switch" ? "Switch" : w.type === "stat" ? "Stat" : "Widget"}
                      </Typography>
                      {canEdit && (
                        <Button
                          size="small"
                          startIcon={<TuneIcon />}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => setEditWidgetId(w.id)}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => onRemoveWidget(sectionId, w.id)}
                      >
                        Remove
                      </Button>
                    </Stack>
                  )}
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <WidgetRenderer
                      widget={w}
                      capabilities={capabilities}
                      editMode={editMode}
                      chrome={false}
                    />
                  </Box>
                </Paper>
              </div>
            );
          })}
        </GridLayout>
      )}
      {widgets.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
          {editMode ? "No widgets yet — use Add widget." : "Empty section."}
        </Typography>
      )}

      <EChartsWidgetEditor
        open={Boolean(editing) && editingEcharts}
        widget={editingEcharts ? editing : null}
        capabilities={capabilities}
        onClose={() => setEditWidgetId(null)}
        onSave={(patch) => {
          if (!editing) return;
          const nextConfig = { ...(patch.config ?? {}) };
          onUpdateWidget(sectionId, editing.id, {
            title: patch.title,
            type: patch.type ?? "echarts",
            bindings: patch.bindings ?? editing.bindings,
            config: nextConfig,
          });
        }}
      />

      <CoreWidgetEditor
        open={Boolean(editing) && editingCore}
        widget={editingCore ? editing : null}
        capabilities={capabilities}
        onClose={() => setEditWidgetId(null)}
        onSave={(patch) => {
          if (!editing) return;
          onUpdateWidget(sectionId, editing.id, {
            title: patch.title,
            bindings: patch.bindings ?? editing.bindings,
          });
        }}
      />
    </Box>
  );
}
