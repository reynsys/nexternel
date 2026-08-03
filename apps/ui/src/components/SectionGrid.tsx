import { useEffect, useRef, useState, type DragEvent } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneIcon from "@mui/icons-material/Tune";
import type { Capability, WidgetInstance } from "../api";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { CoreWidgetEditor } from "../widgets/CoreWidgetEditor";
import { AirQualityWidgetEditor } from "../widgets/AirQualityWidgetEditor";
import { ClockWidgetEditor } from "../widgets/ClockWidgetEditor";
import { EChartsWidgetEditor, isEchartsWidgetType } from "../widgets/echarts";
import { GeneralWidgetEditor } from "../widgets/GeneralWidgetEditor";
import { isGeneralWidgetType } from "../widgets/general";
import { CLOCK_WIDGET_TYPE } from "@nexternel/plugin-example-clock";
import { AIR_QUALITY_WIDGET_TYPE } from "@nexternel/plugin-air-quality";
import { contentSurfaceSx } from "../skins/surfaceStyles";
import { useGradientActive, useSolidContentPanels } from "../skins/useSurfaceStyles";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const WIDGET_DRAG_MIME = "application/x-nexternel-widget";

type Props = {
  sectionId: string;
  widgets: WidgetInstance[];
  capabilities: Capability[];
  editMode: boolean;
  onLayoutChange: (sectionId: string, next: Layout[]) => void;
  onRemoveWidget: (sectionId: string, widgetId: string) => void;
  onUpdateWidget: (sectionId: string, widgetId: string, patch: Partial<WidgetInstance>) => void;
  onMoveWidget?: (fromSectionId: string, toSectionId: string, widgetId: string) => void;
  widgetDrag?: { widgetId: string; fromSectionId: string } | null;
  onWidgetDragStart?: (sectionId: string, widgetId: string) => void;
  onWidgetDragEnd?: () => void;
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
};

function isCoreEditable(type: string): boolean {
  return type === "switch" || type === "stat";
}

function isClockWidget(type: string): boolean {
  return type === CLOCK_WIDGET_TYPE;
}

function isAirQualityWidget(type: string): boolean {
  return type === AIR_QUALITY_WIDGET_TYPE;
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
  onMoveWidget,
  widgetDrag,
  onWidgetDragStart,
  onWidgetDragEnd,
  onCapabilityState,
}: Props) {
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [editWidgetId, setEditWidgetId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState(false);
  const gradientActive = useGradientActive();
  const solidContentPanels = useSolidContentPanels();

  const mutedLabel = alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.62 : 0.55);
  const canAcceptDrop =
    editMode &&
    widgetDrag &&
    widgetDrag.fromSectionId !== sectionId &&
    Boolean(onMoveWidget);

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

  /** Charts must remeasure when edit chrome appears (toolbar + resize handle). */
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 80);
    return () => window.clearTimeout(t);
  }, [editMode, width]);

  const layout: Layout[] = widgets
    .filter((w) => typeof w.id === "string" && w.id.trim())
    .map((w) => {
      const l = w.layout ?? { i: w.id, x: 0, y: 0, w: 4, h: 4 };
      return {
        i: w.id,
        x: l.x ?? 0,
        y: l.y ?? 0,
        w: l.w ?? 4,
        h: l.h ?? 4,
        minW: l.minW ?? 2,
        minH: l.minH ?? 2,
      };
    });

  const editing = editWidgetId
    ? widgets.find((w) => w.id === editWidgetId) ?? null
    : null;
  const editingEcharts = editing ? isEchartsWidgetType(editing.type) : false;
  const editingCore = editing ? isCoreEditable(editing.type) : false;
  const editingClock = editing ? isClockWidget(editing.type) : false;
  const editingAirQuality = editing ? isAirQualityWidget(editing.type) : false;
  const editingGeneral = editing ? isGeneralWidgetType(editing.type) : false;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDropHighlight(false);
    if (!canAcceptDrop) return;
    try {
      const raw = e.dataTransfer.getData(WIDGET_DRAG_MIME);
      const parsed = JSON.parse(raw) as { widgetId?: string; sectionId?: string };
      if (
        typeof parsed.widgetId === "string" &&
        typeof parsed.sectionId === "string" &&
        parsed.sectionId !== sectionId
      ) {
        onMoveWidget?.(parsed.sectionId, sectionId, parsed.widgetId);
      }
    } catch {
      /* ignore */
    }
    onWidgetDragEnd?.();
  }

  return (
    <Box
      ref={hostRef}
      onDragOver={(e) => {
        if (!canAcceptDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropHighlight(true);
      }}
      onDragEnter={(e) => {
        if (!canAcceptDrop) return;
        e.preventDefault();
        setDropHighlight(true);
      }}
      onDragLeave={(e) => {
        if (!hostRef.current?.contains(e.relatedTarget as Node)) {
          setDropHighlight(false);
        }
      }}
      onDrop={handleDrop}
      sx={{
        width: "100%",
        minHeight: widgets.length ? 160 : 72,
        borderRadius: 2,
        p: editMode ? 1.5 : 0.5,
        bgcolor: (t) =>
          dropHighlight
            ? alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.14 : 0.1)
            : editMode
              ? t.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)"
              : "transparent",
        outline: editMode || dropHighlight ? "1px dashed" : "none",
        outlineColor: dropHighlight ? "primary.main" : "divider",
        transition: "outline-color 0.15s ease, background-color 0.15s ease",
        /* RGL sets pixel height on .react-grid-item; children must fill it. */
        "& .react-grid-item": {
          overflow: "hidden",
          boxSizing: "border-box",
        },
        "& .react-grid-item > div": {
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        },
      }}
    >
      {editMode && widgets.length > 0 && (
        <Typography variant="caption" sx={{ display: "block", mb: 1, color: mutedLabel }}>
          Drag the handle to move within this section · use the move icon to drag to another section
        </Typography>
      )}
      {editMode && canAcceptDrop && dropHighlight && (
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 1, color: "primary.main", fontWeight: 600 }}
        >
          Drop here to move widget into this section
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
            const clock = isClockWidget(w.type);
            const airQuality = isAirQualityWidget(w.type);
            const general = isGeneralWidgetType(w.type);
            const canEdit = echarts || core || clock || airQuality || general;
            return (
              <div key={w.id} data-nx-grid-widget={w.id}>
                <Paper
                  elevation={editMode ? 2 : 0}
                  variant={editMode ? "elevation" : "outlined"}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    ...contentSurfaceSx(gradientActive, solidContentPanels),
                  }}
                >
                  {editMode && (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{
                        flexShrink: 0,
                        px: 0.5,
                        py: 0.25,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: (t) =>
                          alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.1 : 0.06),
                      }}
                    >
                      <Tooltip title="Drag to reposition in this section">
                        <IconButton
                          size="small"
                          className="widget-drag-handle"
                          aria-label="Drag widget in section"
                          sx={{ cursor: "grab", touchAction: "none" }}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Drag to another section">
                        <IconButton
                          size="small"
                          aria-label="Move widget to another section"
                          draggable={editMode}
                          sx={{ cursor: "grab", touchAction: "none" }}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              WIDGET_DRAG_MIME,
                              JSON.stringify({ widgetId: w.id, sectionId })
                            );
                            e.dataTransfer.effectAllowed = "move";
                            onWidgetDragStart?.(sectionId, w.id);
                          }}
                          onDragEnd={() => onWidgetDragEnd?.()}
                        >
                          <DriveFileMoveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography
                        variant="caption"
                        sx={{ flex: 1, color: mutedLabel }}
                        noWrap
                      >
                        {echarts
                          ? "ECharts"
                          : airQuality
                            ? "Air quality"
                            : clock
                            ? "Clock"
                            : general
                              ? w.type === "calendar"
                                ? "Calendar"
                                : w.type === "weather"
                                  ? "Weather"
                                  : w.type === "system_info"
                                    ? "System"
                                    : w.type === "device_status"
                                      ? "Devices"
                                      : w.type === "camera"
                                        ? "Camera"
                                        : "General"
                              : w.type === "switch"
                                ? "Switch"
                                : w.type === "stat"
                                  ? "Stat"
                                  : "Widget"}
                      </Typography>
                      {canEdit && (
                        <Tooltip title="Edit widget">
                          <IconButton
                            size="small"
                            aria-label="Edit widget"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setEditWidgetId(w.id)}
                          >
                            <TuneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Remove widget">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Remove widget"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => onRemoveWidget(sectionId, w.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      p: editMode ? 0.75 : 1,
                      display: "flex",
                      flexDirection: "column",
                      boxSizing: "border-box",
                    }}
                  >
                    <WidgetRenderer
                      widget={w}
                      capabilities={capabilities}
                      editMode={editMode}
                      chrome={false}
                      onCapabilityState={onCapabilityState}
                    />
                  </Box>
                </Paper>
              </div>
            );
          })}
        </GridLayout>
      )}
      {widgets.length === 0 && (
        <Typography sx={{ p: 2, textAlign: "center", color: mutedLabel }}>
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

      <ClockWidgetEditor
        open={Boolean(editing) && editingClock}
        widget={editingClock ? editing : null}
        onClose={() => setEditWidgetId(null)}
        onSave={(patch) => {
          if (!editing) return;
          onUpdateWidget(sectionId, editing.id, {
            title: patch.title,
            config: patch.config ?? editing.config,
          });
        }}
      />

      <AirQualityWidgetEditor
        open={Boolean(editing) && editingAirQuality}
        widget={editingAirQuality ? editing : null}
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

      <GeneralWidgetEditor
        open={Boolean(editing) && editingGeneral}
        widget={editingGeneral ? editing : null}
        onClose={() => setEditWidgetId(null)}
        onSave={(patch) => {
          if (!editing) return;
          onUpdateWidget(sectionId, editing.id, {
            title: patch.title,
            config: patch.config ?? editing.config,
          });
        }}
      />
    </Box>
  );
}
