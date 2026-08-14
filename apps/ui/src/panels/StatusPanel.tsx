import { Typography, useTheme } from "@mui/material";

import type { ResolvedPanelCapability } from "../api";

import { PanelItemGrid } from "../components/PanelItemGrid";

import type { PanelAppearanceLayout } from "../lib/panel-appearance";

import { nestedContentPanelSx } from "../skins/surfaceStyles";

import { useGradientActive, useSolidContentPanels } from "../skins/useSurfaceStyles";

import { PanelCapabilityItemTile } from "./PanelCapabilityItemTile";

import { PanelReadingValue } from "./PanelReadingValue";



type Props = {

  capabilities: ResolvedPanelCapability[];

  layout?: PanelAppearanceLayout;

};



export function StatusPanel({ capabilities, layout = "card" }: Props) {

  const theme = useTheme();

  const gradientActive = useGradientActive();

  const solidContentPanels = useSolidContentPanels();

  const itemSx = nestedContentPanelSx(theme, gradientActive, solidContentPanels);



  if (capabilities.length === 0) {

    return (

      <Typography color="text.secondary">

        No status readings in this scope.

      </Typography>

    );

  }



  return (

    <PanelItemGrid layout={layout} rowSize="fluid" itemCount={capabilities.length}>

      {capabilities.map((cap) => (

        <PanelCapabilityItemTile key={cap.id} cap={cap} itemSx={itemSx}>

          <PanelReadingValue cap={cap} />

        </PanelCapabilityItemTile>

      ))}

    </PanelItemGrid>

  );

}

