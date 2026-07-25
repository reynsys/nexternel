import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type Layout } from "react-grid-layout";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
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
  emptyDocument,
  newId,
  nextWidgetPlacement,
  normalizeDocument,
  sortSections,
} from "../lib/dashboard-document";
import { SectionGrid } from "../components/SectionGrid";
import {
  defaultPresetForKind,
  getEchartsPreset,
  presetIdFromCatalogType,
} from "../widgets/echarts";
import {
  capabilityPickerLabel,
  defaultWidgetTitle,
} from "../lib/capability-labels";

export function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("Dashboard");
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
    const size = preset?.defaultSize ?? {
      w: type === "plugin.clock" ? 4 : type.startsWith("plugin.") ? 4 : 3,
      h: type === "plugin.clock" ? 3 : 3,
    };
    const w = size.w;
    const h = size.h;

    const presetId =
      catalogPresetId ||
      (isEcharts ? defaultPresetForKind(cap?.kind) : undefined);

    const config: Record<string, unknown> = {
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
      type === "plugin.clock"
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
        sections: sortSections(sections).map((s, i) => ({ ...s, order: i })),
      };
      await api.saveDashboard(id, { name, document });
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        {editMode ? (
          <TextField
            size="small"
            label="Dashboard name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <Typography variant="h4">{name}</Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="text" onClick={() => navigate("/dashboards")}>
            Back
          </Button>
          {editMode ? (
            <>
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
                  if (id) {
                    void api.getDashboard(id).then((d) => {
                      loadDocument(d.dashboard.document, d.dashboard.name);
                    });
                  }
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {ordered.length > 1 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {ordered.map((s) => (
            <Chip
              key={s.id}
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
          ))}
        </Stack>
      )}

      {ordered.map((section, index) => (
        <Accordion
          key={section.id}
          id={`dash-section-${section.id}`}
          expanded={!section.collapsed}
          onChange={(_e, expanded) =>
            updateSection(section.id, { collapsed: !expanded })
          }
          disableGutters
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            scrollMarginTop: 16,
            overflow: "hidden",
            bgcolor: "background.paper",
            "&:before": { display: "none" },
            boxShadow: (t) =>
              t.palette.mode === "dark" ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
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
                <TextField
                  size="small"
                  label="Section"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ flex: 1, maxWidth: 360 }}
                />
              ) : (
                <Typography variant="h6" sx={{ flex: 1 }}>
                  {section.title}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {section.widgets.length} widget{section.widgets.length === 1 ? "" : "s"}
              </Typography>
              {editMode && (
                <Stack direction="row" onClick={(e) => e.stopPropagation()}>
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
      ))}

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
