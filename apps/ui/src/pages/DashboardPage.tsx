import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { type Layout } from "react-grid-layout";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  api,
  connectLiveSocket,
  type Capability,
  type DashboardDocument,
  type DashboardSection,
  type WidgetInstance,
} from "../api";
import { getWidgetContribution } from "../plugins/registry";
import {
  catalogByCategory,
  categoriesWithEntries,
  getCatalogEntry,
  groupCatalogByEchartsFamily,
  type WidgetCategoryId,
} from "../library/widget-catalog";
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
import {
  generalDefaultConfig,
  generalDefaultSize,
  isGeneralWidgetType,
} from "../widgets/general";
import { SectionGrid } from "../components/SectionGrid";
import { DashboardTabBar } from "../components/DashboardTabBar";
import { ManageDashboardsPanel } from "../components/ManageDashboardsPanel";
import { DashboardIconPicker } from "../components/DashboardIconPicker";
import { getDashboardIcon } from "../lib/dashboard-icons";
import {
  defaultPresetForKind,
  getEchartsPreset,
  presetIdFromCatalogType,
} from "../widgets/echarts";
import {
  capabilityPickerLabel,
  defaultWidgetTitle,
} from "../lib/capability-labels";
import { useShellAuth } from "../skins/useShellAuth";
import { hasPermission } from "../lib/permissions";
import { chromeSurfaceSx } from "../skins/surfaceStyles";
import { useGradientActive } from "../skins/useSurfaceStyles";

export function DashboardPage() {
  const { id } = useParams<{ id: string }>();
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
  const [sections, setSections] = useState<DashboardSection[]>(
    () => emptyDocument().sections
  );
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSectionId, setAddSectionId] = useState<string>("");
  const [addCategory, setAddCategory] = useState<WidgetCategoryId>("status");
  const [addType, setAddType] = useState("stat");
  const [addCapId, setAddCapId] = useState("");
  const [addRange, setAddRange] = useState("24h");
  const [iconPickerSectionId, setIconPickerSectionId] = useState<string | null>(null);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<HTMLElement | null>(null);
  const [tabRefreshKey, setTabRefreshKey] = useState(0);
  const [manageExpanded, setManageExpanded] = useState(false);

  const categoryOptions = categoriesWithEntries();
  const typeOptions = catalogByCategory(addCategory);
  const typeGroups = groupCatalogByEchartsFamily(typeOptions);
  const selectedEntry = getCatalogEntry(addType);

  const addCapabilityOptions = useMemo(() => {
    const presetId =
      selectedEntry?.presetId ?? presetIdFromCatalogType(addType) ?? null;
    if (presetId && getEchartsPreset(presetId).dataMode === "history") {
      return capabilities.filter((c) => c.kind !== "switch");
    }
    if (addType === "switch") {
      return capabilities.filter((c) => c.kind === "switch");
    }
    if (addType === "stat") {
      return capabilities.filter((c) => c.kind !== "switch");
    }
    return capabilities;
  }, [addType, capabilities, selectedEntry?.presetId]);

  const ordered = useMemo(() => sortSections(sections), [sections]);

  function applyLive(capabilityId: string, value: unknown, quality: string, updatedAt: string) {
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
    setSections(normalized.sections);
    if (normalized.sections[0]) setAddSectionId(normalized.sections[0].id);
  }

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const [dash, caps] = await Promise.all([
          api.getDashboard(id),
          api.capabilities(),
        ]);
        loadDocument(dash.dashboard.document, dash.dashboard.name);
        setCapabilities(caps.capabilities);
        if (caps.capabilities[0]) setAddCapId(caps.capabilities[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    })();
  }, [id]);

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

  function addWidget() {
    const sectionId = addSectionId || sections[0]?.id;
    if (!sectionId) {
      setError("Add a section first");
      return;
    }
    const entry = getCatalogEntry(addType);
    const plugin = getWidgetContribution(addType);
    const requiresCapability =
      entry?.needsCapability ??
      (plugin ? plugin.needsCapability !== false : true);

    const effectiveCapId =
      addCapabilityOptions.some((c) => c.id === addCapId)
        ? addCapId
        : addCapabilityOptions[0]?.id || "";

    if (requiresCapability && !effectiveCapId) {
      setError(
        addType === "switch"
          ? "No switch/relay capability available — register a device first"
          : "Choose a capability first"
      );
      return;
    }
    const cap = effectiveCapId
      ? capabilities.find((c) => c.id === effectiveCapId)
      : undefined;
    const widgetId = newId("w");

    const catalogPresetId =
      entry?.presetId ?? presetIdFromCatalogType(addType) ?? null;
    const isEcharts = Boolean(catalogPresetId);

    let type: string;
    if (addType === "auto") {
      type = cap?.kind === "switch" ? "switch" : "stat";
    } else if (isEcharts) {
      type = "echarts";
    } else {
      type = addType;
    }

    const preset = catalogPresetId ? getEchartsPreset(catalogPresetId) : null;
    const generalSize = isGeneralWidgetType(type) ? generalDefaultSize(type) : null;
    const size = preset?.defaultSize ??
      generalSize ?? {
        w: type === "plugin.clock" ? 4 : type.startsWith("plugin.") ? 4 : 3,
        h: type === "plugin.clock" ? 3 : 3,
      };
    const w = size.w;
    const h = size.h;

    const presetId =
      catalogPresetId ||
      (isEcharts ? defaultPresetForKind(cap?.kind) : undefined);

    const config: Record<string, unknown> = {
      ...(isGeneralWidgetType(type) ? generalDefaultConfig(type) : {}),
      ...(entry?.defaultConfig ?? {}),
      ...(presetId ? { presetId } : {}),
    };
    if (preset?.dataMode === "history") {
      config.range = addRange;
    }
    if (type === "plugin.clock") {
      config.timeMode = "digital";
      config.digitalStyle = "standard";
      config.showSeconds = true;
      config.showDate = true;
      config.fontScale = 1;
    }

    const title =
      type === "plugin.clock" || isGeneralWidgetType(type)
        ? undefined
        : type === "switch" || type === "stat" || addType === "auto"
          ? defaultWidgetTitle(cap, entry?.label || type)
          : entry?.label || plugin?.label || defaultWidgetTitle(cap, type);

    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const pos = nextWidgetPlacement(s.widgets, w);
        const widget: WidgetInstance = {
          id: widgetId,
          type,
          title,
          layout: {
            i: widgetId,
            x: pos.x,
            y: pos.y,
            w,
            h,
            minW: preset?.dataMode === "history" ? 3 : 2,
            minH: preset?.dataMode === "history" ? 3 : 2,
          },
          bindings:
            requiresCapability && effectiveCapId
              ? { capabilityId: effectiveCapId }
              : {},
          config,
        };
        return { ...s, widgets: [...s.widgets, widget] };
      })
    );
    setError(null);
    setAddOpen(false);
  }

  function removeWidget(sectionId: string, widgetId: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      widgets: s.widgets.filter((w) => w.id !== widgetId),
    }));
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

  async function save() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const document: DashboardDocument = {
        schemaVersion: 2,
        name,
        tabIcon,
        showTabLabel,
        sections: sortSections(sections).map((s, i) => ({
          ...s,
          order: i,
          colSpan: normalizeSectionColSpan(s.colSpan),
        })),
      };
      await api.saveDashboard(id, { name, document });
      setEditMode(false);
      setTabRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2}>
      <DashboardTabBar
        activeId={id}
        refreshKey={tabRefreshKey}
        editMode={editMode}
        canEdit={canEditDashboards}
        onDashboardOptions={() => {
          if (!canEditDashboards) return;
          setEditMode(true);
          setManageExpanded(true);
        }}
      />

      {editMode && canEditDashboards && (
        <Stack spacing={2}>
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
              <Button
                variant="outlined"
                onClick={() => {
                  if (!addSectionId && sections[0]) setAddSectionId(sections[0].id);
                  setAddOpen(true);
                }}
              >
                Add widget
              </Button>
              <Button variant="contained" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setManageExpanded(false);
                  if (id) {
                    void api.getDashboard(id).then((d) => {
                      loadDocument(d.dashboard.document, d.dashboard.name);
                    });
                  }
                }}
              >
                Done
              </Button>
            </Stack>
          </Stack>

          <Accordion
            expanded={manageExpanded}
            onChange={(_e, exp) => setManageExpanded(exp)}
            disableGutters
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              "&:before": { display: "none" },
              overflow: "hidden",
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FolderOpenIcon fontSize="small" color="action" />
                <Typography fontWeight={600}>Manage dashboards</Typography>
                <Typography variant="caption" color="text.secondary">
                  Create · default · tab icons
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <ManageDashboardsPanel
                compact
                onDashboardsChanged={() => setTabRefreshKey((k) => k + 1)}
              />
            </AccordionDetails>
          </Accordion>
        </Stack>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {ordered.length > 1 && (
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
                    <SecIcon color="action" fontSize="small" />
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
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {section.widgets.length} widget{section.widgets.length === 1 ? "" : "s"}
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
                        onClick={() => {
                          setAddSectionId(section.id);
                          setAddOpen(true);
                        }}
                      >
                        Add widget
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                <SectionGrid
                  sectionId={section.id}
                  widgets={section.widgets}
                  capabilities={capabilities}
                  editMode={editMode}
                  onLayoutChange={onLayoutChange}
                  onRemoveWidget={removeWidget}
                  onUpdateWidget={updateWidget}
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add widget</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="section-target">Section</InputLabel>
              <Select
                labelId="section-target"
                label="Section"
                value={addSectionId || ordered[0]?.id || ""}
                onChange={(e) => setAddSectionId(e.target.value)}
              >
                {ordered.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="widget-cat">Category</InputLabel>
              <Select
                labelId="widget-cat"
                label="Category"
                value={addCategory}
                onChange={(e) => {
                  const cat = e.target.value as WidgetCategoryId;
                  setAddCategory(cat);
                  const first = catalogByCategory(cat)[0];
                  if (first) setAddType(first.type);
                }}
              >
                {categoryOptions.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              {categoryOptions.find((c) => c.id === addCategory)?.description}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="widget-type">Type</InputLabel>
              <Select
                labelId="widget-type"
                label="Type"
                value={
                  typeOptions.some((t) => t.type === addType)
                    ? addType
                    : typeOptions[0]?.type || ""
                }
                onChange={(e) => {
                  const next = e.target.value;
                  setAddType(next);
                  const entry = getCatalogEntry(next);
                  const presetId = entry?.presetId ?? presetIdFromCatalogType(next);
                  let pool = capabilities;
                  if (next === "switch") {
                    pool = capabilities.filter((c) => c.kind === "switch");
                  } else if (
                    next === "stat" ||
                    (presetId && getEchartsPreset(presetId).dataMode === "history")
                  ) {
                    pool = capabilities.filter((c) => c.kind !== "switch");
                  }
                  const stillValid = pool.some((c) => c.id === addCapId);
                  if (!stillValid) {
                    setAddCapId(pool[0]?.id ?? "");
                  }
                }}
              >
                {typeGroups.flatMap((g) => [
                  <ListSubheader key={`g-${g.familyLabel}`}>
                    {g.familyLabel}
                  </ListSubheader>,
                  ...g.entries.map((t) => (
                    <MenuItem key={t.type} value={t.type}>
                      {t.label}
                    </MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>
            {typeGroups.find((g) => g.entries.some((e) => e.type === addType))?.familyHint && (
              <Typography variant="caption" color="text.secondary">
                {
                  typeGroups.find((g) => g.entries.some((e) => e.type === addType))
                    ?.familyHint
                }
              </Typography>
            )}
            {selectedEntry?.description && (
              <Typography variant="caption" color="text.secondary">
                {selectedEntry.description}
              </Typography>
            )}
            {selectedEntry?.presetId &&
              getEchartsPreset(selectedEntry.presetId).dataMode === "history" && (
              <FormControl fullWidth>
                <InputLabel id="hist-range">Range</InputLabel>
                <Select
                  labelId="hist-range"
                  label="Range"
                  value={addRange}
                  onChange={(e) => setAddRange(e.target.value)}
                >
                  <MenuItem value="1h">Last 1 hour</MenuItem>
                  <MenuItem value="6h">Last 6 hours</MenuItem>
                  <MenuItem value="24h">Last 24 hours</MenuItem>
                  <MenuItem value="7d">Last 7 days</MenuItem>
                </Select>
              </FormControl>
            )}
            {(selectedEntry?.needsCapability ?? true) && (
              <FormControl fullWidth>
                <InputLabel id="cap">
                  {addType === "switch" ? "Relay / switch" : "Capability"}
                </InputLabel>
                <Select
                  labelId="cap"
                  label={addType === "switch" ? "Relay / switch" : "Capability"}
                  value={
                    addCapabilityOptions.some((c) => c.id === addCapId)
                      ? addCapId
                      : addCapabilityOptions[0]?.id || ""
                  }
                  onChange={(e) => setAddCapId(e.target.value)}
                >
                  {addCapabilityOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {capabilityPickerLabel(c)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {addType === "switch" && addCapabilityOptions.length === 0 && (
              <Typography variant="caption" color="warning.main">
                No switch capabilities found — register relays on the Devices page and sync
                capabilities.
              </Typography>
            )}
            {selectedEntry?.needsCapability !== false &&
              addCapabilityOptions.length > 0 &&
              addCapId && (
                <Typography variant="caption" color="text.secondary">
                  Widget title will default to the relay/sensor name. You can rename it with Edit
                  after adding.
                </Typography>
              )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              (selectedEntry?.needsCapability ?? true)
                ? addCapabilityOptions.length === 0
                : false
            }
            onClick={() => {
              try {
                addWidget();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add widget");
              }
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
