import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useParams } from "react-router-dom";
import { type Layout } from "react-grid-layout";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import TabRoundedIcon from "@mui/icons-material/TabRounded";
import {
  api,
  connectLiveSocket,
  mergeCapabilitiesWithLiveCache,
  recordLiveCapabilityState,
  type Capability,
  type DashboardDocument,
  type DashboardSection,
  type ResolvedPanelCapability,
  type WidgetInstance,
} from "../api";
import { getPanelContribution } from "../plugins/registry";
import {
  findAddPanelCatalogItem,
  loadAddPanelCatalog,
  type UnifiedPanelCatalogItem,
} from "../lib/add-panel-catalog";
import {
  isCorePanelCatalogType,
  panelCatalogItemId,
  panelIsIntegrationKind,
  panelUsesAreaScope,
  panelUsesCapabilityScope,
  type PanelContentMode,
} from "@nexternel/domain";
import {
  DEFAULT_SECTION_ICON,
  emptyDocument,
  newId,
  nextWidgetPlacement,
  normalizeDocument,
  normalizeSectionColSpan,
  sectionColSpanLabel,
  sortSections,
  type SectionColSpan,
} from "../lib/dashboard-document";
import { SlotBindingFields } from "../components/SlotBindingFields";
import { PanelContentFields } from "../components/PanelContentFields";
import { bindingsFromSlots } from "../lib/widget-bindings";
import { suggestSlotBindings } from "../lib/slot-bindings";
import { SectionGrid } from "../components/SectionGrid";
import { AREA } from "../lib/area-labels";
import {
  panelDefaultSize,
  fetchSelectablePanelOptions,
} from "../widgets/panel";
import {
  loadSystemsInScope,
} from "../lib/panel-catalog";
import {
  buildPanelScopeConfig,
  defaultContentModeForPanel,
  previewPanelScopeForItemOptions,
  previewPanelScopeFromEditorFields,
} from "../lib/panel-scope";
import { PLUGIN_ITEM_PICKER_HEADING } from "../lib/panel-content-copy";
import { prepareDashboardSections } from "../lib/panel-normalize";
import { DashboardTabBar } from "../components/DashboardTabBar";
import { ManageDashboardsPanel } from "../components/ManageDashboardsPanel";
import { DashboardErrorBoundary } from "../components/DashboardErrorBoundary";
import { DashboardIconPicker } from "../components/DashboardIconPicker";
import { getDashboardIcon } from "../lib/dashboard-icons";
import { useShellAuth } from "../skins/useShellAuth";
import { hasPermission } from "../lib/permissions";
import { chromeSurfaceSx } from "../skins/surfaceStyles";
import { useGradientActive } from "../skins/useSurfaceStyles";
import { resolveHomeDashboardId } from "../lib/home-dashboard";
import { generalDefaultConfig } from "../widgets/general/config";
import { GAUGE_WIDGET_TYPE } from "../widgets/gauge";
import { defaultPresetForKind } from "../widgets/echarts/config";
import { AIR_QUALITY_WIDGET_TYPE } from "@nexternel/plugin-air-quality";

function sectionContentSummary(widgets: WidgetInstance[]): string {
  const count = widgets.length;
  if (!count) return "";
  return `${count} panel${count === 1 ? "" : "s"}`;
}

export function DashboardPage() {
  const { id: routeDashboardId } = useParams<{ id?: string }>();
  const [dashboardId, setDashboardId] = useState<string | null>(routeDashboardId ?? null);
  const [pageLoading, setPageLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const { permissions, isAdmin } = useShellAuth();
  const canEditDashboards = hasPermission(
    permissions,
    "editDashboards",
    isAdmin
  );
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const gradientActive = useGradientActive();
  const [name, setName] = useState("Dashboard");
  const [tabIcon, setTabIcon] = useState("dashboard");
  const [showTabLabel, setShowTabLabel] = useState(true);
  const [showSectionNav, setShowSectionNav] = useState(false);
  const [sections, setSections] = useState<DashboardSection[]>(
    () => emptyDocument().sections
  );
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addPanelSectionId, setAddPanelSectionId] = useState("");
  const [addPanelType, setAddPanelType] = useState("panel.controls");
  const [addPanelInheritSection, setAddPanelInheritSection] = useState(true);
  const [addPanelAreaId, setAddPanelAreaId] = useState("");
  const [addPanelAppearance, setAddPanelAppearance] = useState("card");
  const [addPanelAreas, setAddPanelAreas] = useState<{ id: string; name: string }[]>([]);
  const [addPanelSystemIds, setAddPanelSystemIds] = useState<string[]>([]);
  const [addPanelCapabilityIds, setAddPanelCapabilityIds] = useState<string[]>([]);
  const [addPanelContentMode, setAddPanelContentMode] = useState<PanelContentMode>("auto");
  const [addPanelScopeCapabilities, setAddPanelScopeCapabilities] = useState<
    ResolvedPanelCapability[]
  >([]);
  const [addPanelCatalog, setAddPanelCatalog] = useState<UnifiedPanelCatalogItem[]>([]);
  const [addPanelSlotValues, setAddPanelSlotValues] = useState<Record<string, string>>({});
  const [addPanelTitle, setAddPanelTitle] = useState("");
  const [scopedSystems, setScopedSystems] = useState<{ id: string; label: string }[]>([]);
  const [addSectionId, setAddSectionId] = useState<string>("");
  const [iconPickerSectionId, setIconPickerSectionId] = useState<string | null>(null);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<HTMLElement | null>(null);
  const [tabRefreshKey, setTabRefreshKey] = useState(0);
  const [tabSettingsOpen, setTabSettingsOpen] = useState(false);
  const [manageDashboardsOpen, setManageDashboardsOpen] = useState(false);
  const [editBaseline, setEditBaseline] = useState<{
    name: string;
    tabIcon: string;
    showTabLabel: boolean;
    showSectionNav: boolean;
    sections: DashboardSection[];
  } | null>(null);
  const [widgetDrag, setWidgetDrag] = useState<{
    widgetId: string;
    fromSectionId: string;
  } | null>(null);

  const addPanelIsCore = isCorePanelCatalogType(addPanelType);
  const addPanelShowsAreaScope = addPanelIsCore && panelUsesAreaScope(addPanelType);
  const addPanelShowsSystemFilter = addPanelIsCore && panelUsesCapabilityScope(addPanelType);
  const addPanelShowsLayout = addPanelIsCore && !panelIsIntegrationKind(addPanelType);
  const selectedContribution = addPanelIsCore ? undefined : getPanelContribution(addPanelType);
  const bindingSlots = selectedContribution?.bindingSlots ?? [];
  const hasBindingSlots = bindingSlots.length > 0;
  const selectedCatalogItem = findAddPanelCatalogItem(addPanelCatalog, addPanelType);

  const addPanelPreviewScope = useMemo(() => {
    const section = sections.find((s) => s.id === addPanelSectionId);
    return previewPanelScopeFromEditorFields({
      inheritSectionArea: addPanelInheritSection,
      sectionRoomId: section?.roomId ?? null,
      areaId: addPanelAreaId,
      systemIds: addPanelSystemIds,
      contentMode: addPanelContentMode,
      capabilityIds: addPanelCapabilityIds,
    });
  }, [
    sections,
    addPanelSectionId,
    addPanelInheritSection,
    addPanelAreaId,
    addPanelSystemIds,
    addPanelContentMode,
    addPanelCapabilityIds,
  ]);

  const addPanelPreviewScopeKey = `${addPanelPreviewScope.contentMode}|${addPanelPreviewScope.areaIds.join(",")}|${addPanelPreviewScope.systemIds.join(",")}|${addPanelPreviewScope.groupIds.join(",")}|${addPanelPreviewScope.capabilityIds.join(",")}`;

  const ordered = useMemo(() => sortSections(sections), [sections]);

  function applyLive(capabilityId: string, value: unknown, quality: string, updatedAt: string) {
    recordLiveCapabilityState(capabilityId, value, quality, updatedAt);
    setCapabilities((prev) =>
      prev.map((c) =>
        c.id === capabilityId ? { ...c, state: { value, quality, updatedAt } } : c
      )
    );
  }

  function loadDocument(doc: unknown, dashName: string) {
    const normalized = normalizeDocument(doc, dashName);
    setName(normalized.name);
    setTabIcon(normalized.tabIcon ?? "dashboard");
    setShowTabLabel(normalized.showTabLabel !== false);
    setShowSectionNav(normalized.showSectionNav === true);
    setSections(prepareDashboardSections(normalized.sections));
    if (normalized.sections[0]) setAddSectionId(normalized.sections[0].id);
  }

  useEffect(() => {
    if (!addPanelOpen || addPanelIsCore) return;
    const panel = getPanelContribution(addPanelType);
    if (!panel?.bindingSlots?.length) {
      setAddPanelSlotValues({});
      return;
    }
    setAddPanelSlotValues(
      suggestSlotBindings(panel.bindingSlots, capabilities, {
        deviceName: addPanelType === AIR_QUALITY_WIDGET_TYPE ? "air" : undefined,
      })
    );
  }, [addPanelOpen, addPanelType, addPanelIsCore]);

  /** Fill empty binding slots when capabilities load — never overwrite a user pick. */
  useEffect(() => {
    if (!addPanelOpen || addPanelIsCore) return;
    const panel = getPanelContribution(addPanelType);
    if (!panel?.bindingSlots?.length) return;
    setAddPanelSlotValues((prev) => {
      const suggested = suggestSlotBindings(panel.bindingSlots, capabilities, {
        deviceName: addPanelType === AIR_QUALITY_WIDGET_TYPE ? "air" : undefined,
      });
      let changed = false;
      const next = { ...prev };
      for (const slot of panel.bindingSlots) {
        if (!prev[slot.key]?.trim() && suggested[slot.key]) {
          next[slot.key] = suggested[slot.key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [capabilities, addPanelOpen, addPanelType, addPanelIsCore]);

  /** Reload capabilities when opening Add Panel (picks up devices added after page load). */
  useEffect(() => {
    if (!addPanelOpen) return;
    void (async () => {
      try {
        const caps = await api.capabilities();
        setCapabilities(mergeCapabilitiesWithLiveCache(caps.capabilities));
      } catch {
        /* keep existing list */
      }
    })();
  }, [addPanelOpen]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setPageLoading(true);
      setBootError(null);
      try {
        let targetId = routeDashboardId?.trim() || null;
        if (!targetId) {
          targetId = await resolveHomeDashboardId();
        }
        if (!targetId) {
          if (!cancelled) {
            setDashboardId(null);
            setBootError("No dashboards yet — open Manage dashboards to create one.");
          }
          return;
        }
        const [dash, caps] = await Promise.all([
          api.getDashboard(targetId),
          api.capabilities(),
        ]);
        if (cancelled) return;
        setDashboardId(targetId);
        loadDocument(dash.dashboard.document, dash.dashboard.name);
        setCapabilities(mergeCapabilitiesWithLiveCache(caps.capabilities));
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeDashboardId]);

  /** Default dashboard → clean `/` URL (hide internal UUID). */
  useEffect(() => {
    if (pageLoading || !dashboardId || !routeDashboardId) return;
    let cancelled = false;
    void api.dashboards().then((res) => {
      if (cancelled) return;
      const def = res.dashboards.find((d) => d.isDefault);
      if (def?.id === dashboardId) {
        window.history.replaceState(null, "", "/");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pageLoading, dashboardId, routeDashboardId]);


  useEffect(() => {
    return connectLiveSocket((ev) => {
      if (ev.type === "hello" && ev.states) {
        for (const s of ev.states) {
          applyLive(s.capabilityId, s.value, s.quality, s.updatedAt);
        }
      }
      if (ev.type === "capability.updated" && ev.state) {
        applyLive(
          ev.state.capabilityId,
          ev.state.value,
          ev.state.quality,
          ev.state.updatedAt
        );
      }
    });
  }, []);

  function updateSection(
    sectionId: string,
    patch: Partial<DashboardSection> | ((s: DashboardSection) => DashboardSection)
  ) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return typeof patch === "function" ? patch(s) : { ...s, ...patch };
      })
    );
  }

  function onLayoutChange(sectionId: string, next: Layout[]) {
    if (!editMode) return;
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        if (next.length === 0 && s.widgets.length > 0) return s;
        return {
          ...s,
          widgets: s.widgets.map((w) => {
            const l = next.find((x) => x.i === w.id);
            if (!l) return w;
            return {
              ...w,
              layout: {
                i: w.id,
                x: l.x,
                y: Number.isFinite(l.y) ? l.y : w.layout.y,
                w: l.w,
                h: l.h,
                minW: l.minW,
                minH: l.minH,
              },
            };
          }),
        };
      })
    );
  }

  function addSection() {
    const order = sections.length === 0 ? 0 : Math.max(...sections.map((s) => s.order)) + 1;
    const section: DashboardSection = {
      id: newId("section"),
      title: `Section ${order + 1}`,
      order,
      collapsed: false,
      icon: DEFAULT_SECTION_ICON,
      colSpan: 12,
      widgets: [],
    };
    setSections((prev) => [...prev, section]);
    setAddSectionId(section.id);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => {
      if (prev.length <= 1) {
        setError("Keep at least one section");
        return prev;
      }
      return prev.filter((s) => s.id !== sectionId);
    });
  }

  function moveSection(sectionId: string, dir: -1 | 1) {
    const sorted = sortSections(sections);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[swap]!;
    const next = sorted.map((s) => {
      if (s.id === a.id) return { ...s, order: b.order };
      if (s.id === b.id) return { ...s, order: a.order };
      return s;
    });
    // reassign contiguous orders
    const reordered = sortSections(next).map((s, i) => ({ ...s, order: i }));
    setSections(reordered);
  }

  function openAddPanel(sectionId?: string) {
    const sid = sectionId || addSectionId || sections[0]?.id || "";
    if (sectionId) setAddSectionId(sectionId);
    const section = sections.find((s) => s.id === sid);
    setAddPanelSectionId(sid);
    setAddPanelType("panel.controls");
    setAddPanelInheritSection(Boolean(section?.roomId));
    setAddPanelAreaId("");
    setAddPanelSystemIds([]);
    setAddPanelCapabilityIds([]);
    setAddPanelScopeCapabilities([]);
    setAddPanelAppearance("card");
    setAddPanelSlotValues({});
    setAddPanelTitle("");
    setAddPanelOpen(true);
    void api.rooms().then((r) => {
      setAddPanelAreas(r.rooms.map((room) => ({ id: room.id, name: room.name })));
    });
    void Promise.all([loadAddPanelCatalog(), fetchSelectablePanelOptions()]).then(
      ([catalog]) => {
        setAddPanelCatalog(catalog);
        const defaultCore = catalog.find((item) => item.source === "core");
        if (defaultCore) {
          setAddPanelType(defaultCore.kind);
        } else if (catalog[0]) {
          setAddPanelType(
            catalog[0].source === "core" ? catalog[0].kind : catalog[0].type
          );
        }
      }
    );
  }

  function addPanel() {
    const sectionId = addPanelSectionId || sections[0]?.id;
    if (!sectionId) {
      setError("Add a section first");
      return;
    }

    if (!isCorePanelCatalogType(addPanelType)) {
      const contribution = getPanelContribution(addPanelType);
      if (!contribution) {
        setError("Unknown panel type");
        return;
      }
      const slotDefs = contribution.bindingSlots ?? [];
      const hasSlots = slotDefs.length > 0;

      if (hasSlots) {
        const missing = slotDefs.filter(
          (s) => s.required && !addPanelSlotValues[s.key]?.trim()
        );
        if (missing.length > 0) {
          setError(`Choose: ${missing.map((s) => s.label).join(", ")}`);
          return;
        }
      }

      const widgetId = newId("w");
      const size = contribution.defaultSize ?? { w: 4, h: 4 };
      const w = size.w;
      const h = size.h;

      const config: Record<string, unknown> = {};
      const boundCapId =
        addPanelSlotValues.primary ??
        Object.values(addPanelSlotValues).find((id) => id?.trim()) ??
        "";
      const boundCap = capabilities.find((c) => c.id === boundCapId);
      const customTitle = addPanelTitle.trim();
      if (addPanelType === "plugin.clock") {
        config.timeMode = "digital";
        config.digitalStyle = "standard";
        config.showSeconds = true;
        config.showDate = true;
        config.fontScale = 1;
      } else if (addPanelType === GAUGE_WIDGET_TYPE) {
        config.presetId = defaultPresetForKind(boundCap?.kind);
      }

      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const pos = nextWidgetPlacement(s.widgets, w);
          const widget: WidgetInstance = {
            id: widgetId,
            type: addPanelType,
            title:
              customTitle ||
              (addPanelType === GAUGE_WIDGET_TYPE ? boundCap?.name : undefined) ||
              undefined,
            layout: {
              i: widgetId,
              x: pos.x,
              y: pos.y,
              w,
              h,
              minW: 2,
              minH: 2,
            },
            bindings: hasSlots ? bindingsFromSlots(addPanelSlotValues) : {},
            config,
          };
          return { ...s, widgets: [...s.widgets, widget] };
        })
      );
      setError(null);
      setAddPanelOpen(false);
      return;
    }

    const section = sections.find((s) => s.id === sectionId);
    const size = panelDefaultSize(addPanelType);
    const widgetId = newId("w");
    const customTitle = addPanelTitle.trim();

    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const pos = nextWidgetPlacement(s.widgets, size.w);
        const widget: WidgetInstance = {
          id: widgetId,
          type: addPanelType,
          title: customTitle || undefined,
          layout: {
            i: widgetId,
            x: pos.x,
            y: pos.y,
            w: size.w,
            h: size.h,
            minW: size.minW,
            minH: size.minH,
          },
          bindings: {},
          config: {
            panelScope: buildPanelScopeConfig({
              inheritSectionArea:
                addPanelInheritSection && Boolean(section?.roomId),
              areaIds:
                !addPanelInheritSection && addPanelAreaId ? [addPanelAreaId] : [],
              systemIds: addPanelSystemIds,
              groupIds: [],
              contentMode: addPanelContentMode,
              capabilityIds: addPanelCapabilityIds,
            }),
            ...(addPanelType === "panel.charts"
              ? { chartRange: "24h", chartPresetId: "line-basic" }
              : {}),
            ...(addPanelType === "panel.weather" ? generalDefaultConfig("weather") : {}),
            ...(addPanelType === "panel.devices" ? generalDefaultConfig("device_status") : {}),
            appearance: { layout: addPanelAppearance },
          },
        };
        return { ...s, widgets: [...s.widgets, widget] };
      })
    );
    setError(null);
    setAddPanelOpen(false);
  }

  function resolveAddPanelAreaIds(): string[] {
    const section = sections.find((s) => s.id === addPanelSectionId);
    if (addPanelInheritSection && section?.roomId) return [section.roomId];
    if (!addPanelInheritSection && addPanelAreaId) return [addPanelAreaId];
    return [];
  }

  useEffect(() => {
    if (!addPanelOpen || !addPanelShowsSystemFilter) {
      if (!addPanelOpen) return;
      setScopedSystems([]);
      setAddPanelScopeCapabilities([]);
      return;
    }
    const areaIds = resolveAddPanelAreaIds();
    void loadSystemsInScope(areaIds).then((systems) => {
      setScopedSystems(systems);
      setAddPanelSystemIds((prev) =>
        prev.filter((id) => systems.some((s) => s.id === id))
      );
    });
  }, [
    addPanelOpen,
    addPanelShowsSystemFilter,
    addPanelSectionId,
    addPanelInheritSection,
    addPanelAreaId,
    sections,
  ]);

  useEffect(() => {
    if (!addPanelOpen || !addPanelShowsSystemFilter || !addPanelIsCore) {
      return;
    }
    const section = sections.find((s) => s.id === addPanelSectionId);
    const optionsScope = previewPanelScopeForItemOptions({
      inheritSectionArea: addPanelInheritSection,
      sectionRoomId: section?.roomId ?? null,
      areaId: addPanelAreaId,
      systemIds: addPanelSystemIds,
    });
    void api
      .v4ResolvePanel({
        panelKind: addPanelType,
        panelScope: optionsScope,
      })
      .then((result) => {
        setAddPanelScopeCapabilities(result.capabilities);
        setAddPanelCapabilityIds((prev) =>
          prev.filter((id) => result.capabilities.some((c) => c.id === id))
        );
      })
      .catch(() => setAddPanelScopeCapabilities([]));
  }, [
    addPanelOpen,
    addPanelShowsSystemFilter,
    addPanelIsCore,
    addPanelType,
    addPanelSectionId,
    addPanelInheritSection,
    addPanelAreaId,
    addPanelSystemIds,
  ]);

  useEffect(() => {
    setAddPanelCapabilityIds([]);
    setAddPanelContentMode(defaultContentModeForPanel(addPanelType));
  }, [addPanelType]);

  function removeWidget(sectionId: string, widgetId: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      widgets: s.widgets.filter((w) => w.id !== widgetId),
    }));
  }

  function moveWidgetToSection(
    fromSectionId: string,
    toSectionId: string,
    widgetId: string
  ) {
    if (fromSectionId === toSectionId) return;
    setSections((prev) => {
      let moved: WidgetInstance | null = null;
      const stripped = prev.map((s) => {
        if (s.id !== fromSectionId) return s;
        const w = s.widgets.find((x) => x.id === widgetId);
        if (!w) return s;
        moved = w;
        return { ...s, widgets: s.widgets.filter((x) => x.id !== widgetId) };
      });
      if (!moved) return prev;
      return stripped.map((s) => {
        if (s.id !== toSectionId) return s;
        const pos = nextWidgetPlacement(s.widgets, moved!.layout.w);
        return {
          ...s,
          collapsed: false,
          widgets: [
            ...s.widgets,
            {
              ...moved!,
              layout: {
                ...moved!.layout,
                x: pos.x,
                y: pos.y,
              },
            },
          ],
        };
      });
    });
  }

  function handleSectionWidgetDrop(e: DragEvent, toSectionId: string) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/x-nexternel-widget");
      const parsed = JSON.parse(raw) as { widgetId?: string; sectionId?: string };
      if (
        typeof parsed.widgetId === "string" &&
        typeof parsed.sectionId === "string" &&
        parsed.sectionId !== toSectionId
      ) {
        moveWidgetToSection(parsed.sectionId, toSectionId, parsed.widgetId);
      }
    } catch {
      /* ignore */
    }
    setWidgetDrag(null);
  }

  function updateWidget(
    sectionId: string,
    widgetId: string,
    patch: Partial<WidgetInstance>
  ) {
    updateSection(sectionId, (s) => ({
      ...s,
      widgets: s.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
    }));
  }

  function enterEditMode() {
    setEditBaseline({
      name,
      tabIcon,
      showTabLabel,
      showSectionNav,
      sections: JSON.parse(JSON.stringify(sections)) as DashboardSection[],
    });
    setEditMode(true);
    setError(null);
  }

  function cancelEdit() {
    if (editBaseline) {
      setName(editBaseline.name);
      setTabIcon(editBaseline.tabIcon);
      setShowTabLabel(editBaseline.showTabLabel);
      setShowSectionNav(editBaseline.showSectionNav);
      setSections(editBaseline.sections);
    } else if (dashboardId) {
      void api.getDashboard(dashboardId).then((d) => {
        loadDocument(d.dashboard.document, d.dashboard.name);
      });
    }
    setEditMode(false);
    setEditBaseline(null);
    setTabSettingsOpen(false);
    setManageDashboardsOpen(false);
    setError(null);
  }

  async function save() {
    if (!dashboardId) return;
    setSaving(true);
    setError(null);
    try {
      const document: DashboardDocument = {
        schemaVersion: 2,
        name,
        tabIcon,
        showTabLabel,
        showSectionNav,
        sections: sortSections(sections).map((s, i) => ({
          ...s,
          order: i,
          colSpan: normalizeSectionColSpan(s.colSpan),
        })),
      };
      await api.saveDashboard(dashboardId, { name, document });
      setEditBaseline(null);
      setEditMode(false);
      setTabSettingsOpen(false);
      setManageDashboardsOpen(false);
      setTabRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardErrorBoundary>
    <Stack spacing={2}>
      {pageLoading && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={1}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Loading dashboard…
          </Typography>
        </Stack>
      )}
      {!pageLoading && bootError && (
        <Alert severity="error">{bootError}</Alert>
      )}
      {!pageLoading && !bootError && (
      <>
      <DashboardTabBar
        activeId={dashboardId ?? undefined}
        refreshKey={tabRefreshKey}
        editMode={editMode}
        canEdit={canEditDashboards}
        onDashboardOptions={() => {
          if (!canEditDashboards) return;
          if (!editMode) enterEditMode();
        }}
      />

      {editMode && canEditDashboards && (
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Dashboard options
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" onClick={addSection}>
                Add section
              </Button>
              <Button variant="outlined" onClick={() => openAddPanel()}>
                Add Panel
              </Button>
              <Button
                variant="outlined"
                startIcon={<TabRoundedIcon />}
                onClick={() => setTabSettingsOpen(true)}
              >
                Tab settings
              </Button>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={() => setManageDashboardsOpen(true)}
              >
                Manage dashboards
              </Button>
              <Button variant="contained" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outlined" color="inherit" disabled={saving} onClick={cancelEdit}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}

      <Dialog
        open={tabSettingsOpen}
        onClose={() => setTabSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>This tab (horizontal menu)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              size="small"
              label="Tab name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Shown on the top dashboard tabs — Save to keep changes"
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showTabLabel}
                  onChange={(e) => setShowTabLabel(e.target.checked)}
                />
              }
              label="Show name on tab (off = icon only)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showSectionNav}
                  onChange={(e) => setShowSectionNav(e.target.checked)}
                />
              }
              label="Show section quick-jump row"
            />
            <DashboardIconPicker value={tabIcon} onChange={setTabIcon} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTabSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={manageDashboardsOpen}
        onClose={() => setManageDashboardsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Manage dashboards</DialogTitle>
        <DialogContent>
          <ManageDashboardsPanel
            compact
            currentDashboardId={dashboardId ?? undefined}
            onDashboardsChanged={() => {
              setTabRefreshKey((k) => k + 1);
            }}
            onCurrentTabMeta={(meta) => {
              setName(meta.name);
              setTabIcon(meta.tabIcon);
              setShowTabLabel(meta.showTabLabel);
              setTabRefreshKey((k) => k + 1);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDashboardsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {error && <Alert severity="error">{error}</Alert>}

      {showSectionNav && ordered.length > 1 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {ordered.map((s) => {
            const SecIcon = getDashboardIcon(s.icon);
            return (
              <Chip
                key={s.id}
                icon={<SecIcon />}
                label={s.title}
                clickable
                color={s.collapsed ? "default" : "primary"}
                variant={s.collapsed ? "outlined" : "filled"}
                onClick={() => {
                  updateSection(s.id, { collapsed: false });
                  requestAnimationFrame(() => {
                    document
                      .getElementById(`dash-section-${s.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
              />
            );
          })}
        </Stack>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: 2,
          alignItems: "start",
        }}
      >
        {ordered.map((section, index) => {
          const span = isNarrow ? 12 : normalizeSectionColSpan(section.colSpan);
          const SecIcon = getDashboardIcon(section.icon);
          return (
            <Accordion
              key={section.id}
              id={`dash-section-${section.id}`}
              expanded={!section.collapsed}
              onChange={(_e, expanded) =>
                updateSection(section.id, { collapsed: !expanded })
              }
              onDragOver={(e) => {
                if (
                  !editMode ||
                  !widgetDrag ||
                  widgetDrag.fromSectionId === section.id
                ) {
                  return;
                }
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => handleSectionWidgetDrop(e, section.id)}
              disableGutters
              sx={{
                gridColumn: `span ${span}`,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                scrollMarginTop: 16,
                overflow: "hidden",
                ...chromeSurfaceSx(gradientActive),
                "&:before": { display: "none" },
                boxShadow: (t) =>
                  gradientActive
                    ? "none"
                    : t.palette.mode === "dark"
                      ? "none"
                      : "0 1px 3px rgba(0,0,0,0.06)",
                minWidth: 0,
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ width: "100%", pr: 1 }}
                  onClick={(e) => {
                    if (editMode) e.stopPropagation();
                  }}
                >
                  {editMode ? (
                    <IconButton
                      size="small"
                      aria-label="Section icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIconPickerSectionId(section.id);
                        setIconPickerAnchor(e.currentTarget);
                      }}
                    >
                      <SecIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <SecIcon color="primary" fontSize="small" />
                  )}
                  {editMode ? (
                    <TextField
                      size="small"
                      label="Section"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ flex: 1, maxWidth: 280 }}
                    />
                  ) : (
                    <Typography variant="h6" sx={{ flex: 1 }} noWrap>
                      {section.title}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{ flexShrink: 0, color: "primary.main", fontWeight: 500 }}
                  >
                    {sectionContentSummary(section.widgets)}
                  </Typography>
                  {editMode && (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel id={`span-${section.id}`}>Width</InputLabel>
                        <Select
                          labelId={`span-${section.id}`}
                          label="Width"
                          value={normalizeSectionColSpan(section.colSpan)}
                          onChange={(e) =>
                            updateSection(section.id, {
                              colSpan: Number(e.target.value) as SectionColSpan,
                            })
                          }
                        >
                          {([12, 6, 4, 3] as SectionColSpan[]).map((n) => (
                            <MenuItem key={n} value={n}>
                              {sectionColSpanLabel(n)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton
                        size="small"
                        aria-label="Move section up"
                        disabled={index === 0}
                        onClick={() => moveSection(section.id, -1)}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Move section down"
                        disabled={index === ordered.length - 1}
                        onClick={() => moveSection(section.id, 1)}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeSection(section.id)}
                      >
                        Remove
                      </Button>
                      <Button
                        size="small"
                        onClick={() => openAddPanel(section.id)}
                      >
                        Add Panel
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                <SectionGrid
                  sectionId={section.id}
                  sectionRoomId={section.roomId ?? null}
                  sectionTitle={section.title}
                  widgets={section.widgets}
                  capabilities={capabilities}
                  editMode={editMode}
                  onLayoutChange={onLayoutChange}
                  onRemoveWidget={removeWidget}
                  onUpdateWidget={updateWidget}
                  onMoveWidget={moveWidgetToSection}
                  widgetDrag={widgetDrag}
                  onWidgetDragStart={(sid, wid) =>
                    setWidgetDrag({ fromSectionId: sid, widgetId: wid })
                  }
                  onWidgetDragEnd={() => setWidgetDrag(null)}
                  onCapabilityState={applyLive}
                />
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      <Popover
        open={Boolean(iconPickerAnchor) && Boolean(iconPickerSectionId)}
        anchorEl={iconPickerAnchor}
        onClose={() => {
          setIconPickerAnchor(null);
          setIconPickerSectionId(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, width: 320 }}>
          <DashboardIconPicker
            dense
            value={
              ordered.find((s) => s.id === iconPickerSectionId)?.icon ??
              DEFAULT_SECTION_ICON
            }
            onChange={(iconId) => {
              if (iconPickerSectionId) {
                updateSection(iconPickerSectionId, { icon: iconId });
              }
              setIconPickerAnchor(null);
              setIconPickerSectionId(null);
            }}
          />
        </Box>
      </Popover>

      <Dialog
        open={addPanelOpen}
        onClose={() => setAddPanelOpen(false)}
        fullWidth
        maxWidth="sm"
        keepMounted={false}
      >
        <DialogTitle>Add Panel</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="panel-section-target">Section</InputLabel>
              <Select
                labelId="panel-section-target"
                label="Section"
                value={addPanelSectionId || ordered[0]?.id || ""}
                onChange={(e) => {
                  const sid = e.target.value;
                  setAddPanelSectionId(sid);
                  const sec = sections.find((s) => s.id === sid);
                  setAddPanelInheritSection(Boolean(sec?.roomId));
                }}
              >
                {ordered.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2">Panel type</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {addPanelCatalog.map((opt) => {
                const id = panelCatalogItemId(opt);
                return (
                  <Button
                    key={id}
                    variant={addPanelType === id ? "contained" : "outlined"}
                    onClick={() => {
                      setAddPanelType(id);
                      if (opt.source === "core") {
                        setAddPanelSystemIds([]);
                      }
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {selectedCatalogItem?.description}
            </Typography>

            <TextField
              label="Title (optional)"
              size="small"
              fullWidth
              value={addPanelTitle}
              onChange={(e) => setAddPanelTitle(e.target.value)}
              helperText="Shown above the panel on the dashboard when set"
            />

            {addPanelIsCore && (
              <>
                {addPanelShowsAreaScope && sections.find((s) => s.id === addPanelSectionId)?.roomId ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={addPanelInheritSection}
                        onChange={(e) => setAddPanelInheritSection(e.target.checked)}
                      />
                    }
                    label={`Use this section's ${AREA.singular.toLowerCase()}`}
                  />
                ) : addPanelShowsAreaScope ? (
                  <Typography variant="caption" color="text.secondary">
                    Link this section to an {AREA.singular.toLowerCase()} in section settings to
                    scope panels automatically.
                  </Typography>
                ) : null}

                {addPanelShowsAreaScope && !addPanelInheritSection && (
                  <FormControl fullWidth>
                    <InputLabel id="panel-area-target">{AREA.singular}</InputLabel>
                    <Select
                      labelId="panel-area-target"
                      label={AREA.singular}
                      value={addPanelAreaId}
                      onChange={(e) => setAddPanelAreaId(e.target.value)}
                    >
                      <MenuItem value="">All {AREA.plural.toLowerCase()}</MenuItem>
                      {addPanelAreas.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {addPanelShowsSystemFilter && scopedSystems.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel id="panel-system-filter">Category (optional)</InputLabel>
                    <Select
                      labelId="panel-system-filter"
                      label="Category (optional)"
                      multiple
                      value={addPanelSystemIds}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAddPanelSystemIds(
                          typeof value === "string" ? value.split(",") : value
                        );
                      }}
                      renderValue={(selected) =>
                        selected.length === 0
                          ? "All categories in scope"
                          : selected
                              .map(
                                (id) =>
                                  scopedSystems.find((s) => s.id === id)?.label ?? id
                              )
                              .join(", ")
                      }
                    >
                      {scopedSystems.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          <Checkbox checked={addPanelSystemIds.includes(s.id)} />
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {addPanelShowsSystemFilter && (
                  <PanelContentFields
                    panelKind={addPanelType}
                    contentMode={addPanelContentMode}
                    onContentModeChange={setAddPanelContentMode}
                    capabilityIds={addPanelCapabilityIds}
                    onCapabilityIdsChange={setAddPanelCapabilityIds}
                    options={addPanelScopeCapabilities}
                  />
                )}

                {addPanelShowsLayout && (
                  <FormControl fullWidth>
                    <InputLabel id="panel-appearance">Layout</InputLabel>
                    <Select
                      labelId="panel-appearance"
                      label="Layout"
                      value={addPanelAppearance}
                      onChange={(e) => setAddPanelAppearance(e.target.value)}
                    >
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="compact">Compact</MenuItem>
                      <MenuItem value="grid">Grid</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            {!addPanelIsCore && hasBindingSlots && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">{PLUGIN_ITEM_PICKER_HEADING}</Typography>
                <SlotBindingFields
                  slots={bindingSlots}
                  capabilities={capabilities}
                  values={addPanelSlotValues}
                  onChange={(key, id) =>
                    setAddPanelSlotValues((prev) => ({ ...prev, [key]: id }))
                  }
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPanelOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !addPanelIsCore &&
              hasBindingSlots &&
              bindingSlots.some((s) => s.required && !addPanelSlotValues[s.key]?.trim())
            }
            onClick={() => {
              try {
                addPanel();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add panel");
              }
            }}
          >
            Add Panel
          </Button>
        </DialogActions>
      </Dialog>
      </>
      )}
    </Stack>
    </DashboardErrorBoundary>
  );
}
