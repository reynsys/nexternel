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
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { AirQualityWidgetEditor } from "../widgets/AirQualityWidgetEditor";
import { ClockWidgetEditor } from "../widgets/ClockWidgetEditor";
import { PanelWidgetEditor, isPanelWidgetType, panelLabel } from "../widgets/panel";
import { GAUGE_WIDGET_TYPE } from "../widgets/gauge";
import { EChartsWidgetEditor } from "../widgets/echarts/EChartsWidgetEditor";
import { isEchartsWidgetType } from "../widgets/echarts/config";
import { getPanelContribution } from "../plugins/registry";
import { DashboardTileContext } from "../lib/dashboard-tile-context";
import { dashboardTileTitle } from "../lib/dashboard-tile";
import {
  panelAsGeneralWidget,
  resolveDashboardEditorKind,
} from "../lib/panel-editor-route";
import { GeneralWidgetEditor } from "../widgets/GeneralWidgetEditor";
import { CLOCK_WIDGET_TYPE } from "@nexternel/plugin-example-clock";
import { AIR_QUALITY_WIDGET_TYPE } from "@nexternel/plugin-air-quality";
import { contentSurfaceSx } from "../skins/surfaceStyles";
import { useGradientActive, useSolidContentPanels } from "../skins/useSurfaceStyles";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const WIDGET_DRAG_MIME = "application/x-nexternel-widget";

type Props = {
  sectionId: string;
  sectionRoomId?: string | null;
  sectionTitle?: string;
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

function widgetTypeLabel(type: string): string {
  if (isPanelWidgetType(type)) return panelLabel(type);
  if (type === GAUGE_WIDGET_TYPE || isEchartsWidgetType(type)) return "Gauge";
  return getPanelContribution(type)?.label ?? type;
}

function dashboardItemKind(type: string): "panel" | "plugin" {
  if (isPanelWidgetType(type) || type === GAUGE_WIDGET_TYPE || isEchartsWidgetType(type)) {
    return "panel";
  }
  return "plugin";
}

function isEditableWidget(widget: WidgetInstance): boolean {
  return resolveDashboardEditorKind(widget) !== null;
}

/**
 * RGL inside accordion/collapse needs measured width — WidthProvider often stays at 0.
 */
export function SectionGrid({
  sectionId,
  sectionRoomId,
  sectionTitle,
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

  const prevWidthRef = useRef(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0 && w !== prevWidthRef.current) {
        prevWidthRef.current = w;
        setWidth(w);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);


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
  const editorKind = editing ? resolveDashboardEditorKind(editing) : null;
  const integrationEditWidget =
    editing && editorKind === "integration-panel" ? panelAsGeneralWidget(editing) : null;

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
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          minHeight: 0,
          minWidth: 0,
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
          Drop here to move into this section
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
            const canEdit = isEditableWidget(w);
            const itemKind = dashboardItemKind(w.type);
            const tileTitle = dashboardTileTitle(w);
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
                          aria-label={`Drag ${itemKind} in section`}
                          sx={{ cursor: "grab", touchAction: "none" }}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Drag to another section">
                        <IconButton
                          size="small"
                          aria-label={`Move ${itemKind} to another section`}
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
                        {widgetTypeLabel(w.type)}
                      </Typography>
                      {canEdit && (
                        <Tooltip title={`Edit ${itemKind}`}>
                          <IconButton
                            size="small"
                            aria-label={`Edit ${itemKind}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setEditWidgetId(w.id)}
                          >
                            <TuneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={`Remove ${itemKind}`}>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Remove ${itemKind}`}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => onRemoveWidget(sectionId, w.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                  {tileTitle && (
                    <Typography
                      variant="subtitle2"
                      sx={{
                        flexShrink: 0,
                        px: 1,
                        pt: editMode ? 0.25 : 0.75,
                        pb: 0.25,
                        fontWeight: 600,
                        color: "text.primary",
                      }}
                      noWrap
                      title={tileTitle}
                    >
                      {tileTitle}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      px: 1,
                      pb: 1,
                      pt: tileTitle ? 0 : editMode ? 0.25 : 0.75,
                      display: "flex",
                      flexDirection: "column",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <DashboardTileContext.Provider value={{ showBodyHeading: false }}>
                      <WidgetErrorBoundary widgetId={w.id} widgetType={w.type}>
                        <WidgetRenderer
                          widget={w}
                          capabilities={capabilities}
                          editMode={editMode}
                          sectionRoomId={sectionRoomId}
                          onCapabilityState={onCapabilityState}
                        />
                      </WidgetErrorBoundary>
                    </DashboardTileContext.Provider>
                  </Box>
                </Paper>
              </div>
            );
          })}
        </GridLayout>
      )}
      {widgets.length === 0 && (
        <Typography sx={{ p: 2, textAlign: "center", color: mutedLabel }}>
          {editMode
            ? "No panels yet — use Add Panel."
            : "Empty section."}
        </Typography>
      )}

      {editorKind === "scoped-panel" && editing && (
        <PanelWidgetEditor
          open
          widget={editing}
          sectionRoomId={sectionRoomId}
          sectionTitle={sectionTitle}
          onClose={() => setEditWidgetId(null)}
          onSave={(patch) => {
            onUpdateWidget(sectionId, editing.id, patch);
          }}
        />
      )}

      {editorKind === "integration-panel" && integrationEditWidget && editing && (
        <GeneralWidgetEditor
          open
          widget={integrationEditWidget}
          onClose={() => setEditWidgetId(null)}
          onSave={(patch) => {
            onUpdateWidget(sectionId, editing.id, {
              ...patch,
              type: editing.type,
            });
          }}
        />
      )}

      {editorKind === "clock" && editing && (
        <ClockWidgetEditor
          open
          widget={editing}
          onClose={() => setEditWidgetId(null)}
          onSave={(patch) => {
            onUpdateWidget(sectionId, editing.id, {
              title: patch.title,
              config: patch.config ?? editing.config,
            });
          }}
        />
      )}

      {editorKind === "air-quality" && editing && (
        <AirQualityWidgetEditor
          open
          widget={editing}
          capabilities={capabilities}
          onClose={() => setEditWidgetId(null)}
          onSave={(patch) => {
            onUpdateWidget(sectionId, editing.id, {
              title: patch.title,
              bindings: patch.bindings ?? editing.bindings,
            });
          }}
        />
      )}

      {editorKind === "gauge" && editing && (
        <EChartsWidgetEditor
          open
          widget={editing}
          capabilities={capabilities}
          onClose={() => setEditWidgetId(null)}
          onSave={(patch) => {
            onUpdateWidget(sectionId, editing.id, patch);
          }}
        />
      )}
    </Box>
  );
}
