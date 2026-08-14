import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api";
import { AREA } from "../lib/area-labels";
import {
  loadPreviewPanels,
  loadSystemsInScope,
  type PanelCatalogEntry,
} from "../lib/panel-catalog";
import { PanelRenderer } from "../panels/PanelRenderer";
import { useResolvedPanel } from "../panels/useResolvedPanel";
import { generalDefaultConfig } from "../widgets/general/config";
import { isIntegrationPanelKind } from "../lib/panel-integration";

export function PanelsPage() {
  const [tabs, setTabs] = useState<PanelCatalogEntry[]>([]);
  const [tab, setTab] = useState(0);
  const [areaId, setAreaId] = useState<string>("");
  const [systemId, setSystemId] = useState<string>("");
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [scopedSystems, setScopedSystems] = useState<{ id: string; label: string }[]>([]);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const panelKind = tabs[tab]?.kind ?? "panel.controls";
  const selectedAreaId = areaId || null;
  const panelScope = useMemo(
    () => ({
      areaIds: selectedAreaId ? [selectedAreaId] : [],
      systemIds: systemId ? [systemId] : [],
    }),
    [panelKind, selectedAreaId, systemId]
  );
  const { capabilities, loading, error, reload } = useResolvedPanel(
    panelKind,
    panelScope
  );

  useEffect(() => {
    void loadPreviewPanels()
      .then(setTabs)
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load panel registry");
      });
    void api
      .rooms()
      .then((r) => {
        setAreas(r.rooms.map((room) => ({ id: room.id, name: room.name })));
        setAreasError(null);
      })
      .catch((err) => {
        setAreasError(err instanceof Error ? err.message : "Failed to load areas");
      });
  }, []);

  useEffect(() => {
    const areaIds = selectedAreaId ? [selectedAreaId] : [];
    void loadSystemsInScope(areaIds).then((systems) => {
      setScopedSystems(systems);
      if (systemId && !systems.some((s) => s.id === systemId)) {
        setSystemId("");
      }
    });
  }, [selectedAreaId, systemId]);

  useEffect(() => {
    setSystemId("");
  }, [tab]);

  return (
    <Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Box>
        <Typography variant="h5" component="h1">
          Panel preview (developer)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Internal tool for testing panel types against live data. Operators add panels on{" "}
          <RouterLink to="/">Dashboards</RouterLink> → Edit → Add panel.
        </Typography>
      </Box>

      <Alert severity="info">
        This page lists platform panel <strong>types</strong>, not panels in your home.
        Normal navigation no longer includes this preview.
      </Alert>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab key={t.kind} label={t.label} value={i} />
          ))}
        </Tabs>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="panels-area-label">{AREA.singular}</InputLabel>
            <Select
              labelId="panels-area-label"
              label={AREA.singular}
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <MenuItem value="">All {AREA.plural}</MenuItem>
              {areas.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {scopedSystems.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="panels-system-label">Function</InputLabel>
              <Select
                labelId="panels-system-label"
                label="Function"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
              >
                <MenuItem value="">All in scope</MenuItem>
                {scopedSystems.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Stack>

      {areasError && <Alert severity="warning">{areasError}</Alert>}

      {error && (
        <Alert severity="error" onClose={() => reload()}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress size={32} />
        </Stack>
      ) : (
        <PanelRenderer
          panelKind={panelKind}
          capabilities={capabilities}
          chartRange="24h"
          cameraAreaIds={selectedAreaId ? [selectedAreaId] : []}
          weatherConfig={
            isIntegrationPanelKind(panelKind) && panelKind === "panel.weather"
              ? generalDefaultConfig("weather")
              : undefined
          }
        />
      )}
    </Stack>
  );
}
