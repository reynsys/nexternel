import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import { useEffect, useState } from "react";

import { api, type CameraRecord } from "../api";

import { PanelItemGrid } from "../components/PanelItemGrid";

import type { PanelAppearanceLayout } from "../lib/panel-appearance";

import { PanelItemChrome } from "./PanelItemChrome";

import { CameraWidget } from "../widgets/general/CameraWidget";

import type { WidgetInstance } from "../api";



type Props = {

  areaIds: string[];

  layout?: PanelAppearanceLayout;

};



function cameraTileWidget(cam: CameraRecord): WidgetInstance {

  return {

    id: `cam-${cam.id}`,

    type: "camera",

    layout: { i: cam.id, x: 0, y: 0, w: 4, h: 3 },

    bindings: {},

    config: { cameraId: cam.id },

  };

}



export function CameraPanel({ areaIds, layout = "card" }: Props) {

  const [cameras, setCameras] = useState<CameraRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    let cancelled = false;

    setLoading(true);

    void api

      .cameras()

      .then((r) => {

        if (cancelled) return;

        let list = r.cameras.filter((c) => c.enabled);

        if (areaIds.length > 0) {

          list = list.filter((c) => c.areaId && areaIds.includes(c.areaId));

        }

        list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

        setCameras(list);

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

  }, [areaIds.join(",")]);



  if (loading) {

    return (

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, py: 4 }}>

        Loading cameras…

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



  if (cameras.length === 0) {

    return (

      <Box component="span" color="text.secondary" sx={{ typography: "body2" }}>

        No cameras in this scope. Register cameras under Admin → Cameras and link them to an

        Area.

      </Box>

    );

  }



  return (

    <PanelItemGrid layout={layout} rowSize="fluid" itemCount={cameras.length}>

      {cameras.map((cam) => (

        <PanelItemChrome

          key={cam.id}

          contextLabel={cam.areaName}

          title={cam.name}

          showContext={Boolean(cam.areaName?.trim())}

          contentSx={{ minHeight: 0 }}

        >

          <CameraWidget widget={cameraTileWidget(cam)} />

        </PanelItemChrome>

      ))}

    </PanelItemGrid>

  );

}

