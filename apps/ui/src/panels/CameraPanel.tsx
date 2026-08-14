import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { PanelContentMode } from "@nexternel/domain";
import { api, type CameraRecord } from "../api";
import { PanelItemGrid } from "../components/PanelItemGrid";
import type { PanelAppearanceLayout } from "../lib/panel-appearance";
import { PanelItemChrome } from "./PanelItemChrome";
import { CameraWidget } from "../widgets/general/CameraWidget";
import type { WidgetInstance } from "../api";

type Props = {
  areaIds: string[];
  cameraIds?: string[];
  contentMode?: PanelContentMode;
  layout?: PanelAppearanceLayout;
};

/** Panel-embedded camera tiles — chrome shows the name; stream is video only. */
function cameraTileWidget(cam: CameraRecord): WidgetInstance {
  return {
    id: `cam-${cam.id}`,
    type: "camera",
    layout: { i: cam.id, x: 0, y: 0, w: 4, h: 3 },
    bindings: {},
    config: { cameraId: cam.id, embeddedInPanel: true },
  };
}

function filterCameras(
  all: CameraRecord[],
  areaIds: string[],
  contentMode: PanelContentMode,
  cameraIds: string[]
): CameraRecord[] {
  let list = all.filter((c) => c.enabled);
  if (areaIds.length > 0) {
    list = list.filter((c) => c.areaId && areaIds.includes(c.areaId));
  }
  if (contentMode === "manual") {
    if (cameraIds.length === 0) return [];
    const byId = new Map(list.map((c) => [c.id, c]));
    return cameraIds.map((id) => byId.get(id)).filter((c): c is CameraRecord => Boolean(c));
  }
  return list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function CameraPanel({
  areaIds,
  cameraIds = [],
  contentMode = "auto",
  layout = "card",
}: Props) {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const areaKey = areaIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api
      .cameras()
      .then((r) => {
        if (cancelled) return;
        setCameras(r.cameras);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setCameras([]);
        setError(err instanceof Error ? err.message : "Failed to load cameras");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => filterCameras(cameras, areaIds, contentMode, cameraIds),
    [cameras, areaKey, contentMode, cameraIds.join(",")]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, py: 4 }}>
        <Stack spacing={1} alignItems="center">
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Loading cameras…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box component="span" color="error.main" sx={{ typography: "body2" }}>
        {error}
      </Box>
    );
  }

  if (visible.length === 0) {
    return (
      <Box component="span" color="text.secondary" sx={{ typography: "body2" }}>
        {contentMode === "manual"
          ? "No cameras selected. Edit this panel and choose which cameras to show."
          : "No cameras in this scope. Register cameras under Admin → Cameras and link them to an Area."}
      </Box>
    );
  }

  return (
    <PanelItemGrid layout={layout} rowSize="fluid" itemCount={visible.length}>
      {visible.map((cam) => (
        <PanelItemChrome
          key={cam.id}
          title={cam.name}
          showContext={false}
          contentSx={{ minHeight: 0 }}
        >
          <CameraWidget widget={cameraTileWidget(cam)} />
        </PanelItemChrome>
      ))}
    </PanelItemGrid>
  );
}
