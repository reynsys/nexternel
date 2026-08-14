import {

  Box,

  CardActionArea,

  Stack,

  Switch,

  Typography,

  alpha,

  useTheme,

} from "@mui/material";

import PowerSettingsNewOutlinedIcon from "@mui/icons-material/PowerSettingsNewOutlined";

import type { ResolvedPanelCapability } from "../api";

import { PanelItemGrid } from "../components/PanelItemGrid";

import type { PanelAppearanceLayout } from "../lib/panel-appearance";

import { nestedContentPanelSx } from "../skins/surfaceStyles";

import { useGradientActive, useSolidContentPanels } from "../skins/useSurfaceStyles";

import { useSwitchControl } from "../widgets/switch/useSwitchControl";

import { PanelCapabilityAreaLine } from "./PanelCapabilityAreaLine";

import { asSwitchCapability, controlsActionCapabilities } from "./panel-capabilities";



function ControlTile({ cap, compact }: { cap: ResolvedPanelCapability; compact: boolean }) {

  const theme = useTheme();

  const gradientActive = useGradientActive();

  const solidContentPanels = useSolidContentPanels();

  const itemSx = nestedContentPanelSx(theme, gradientActive, solidContentPanels);

  const switchCap = asSwitchCapability(cap);

  const { on, busy, error, toggle } = useSwitchControl(switchCap, false);

  const accent = theme.palette.primary.main;

  const muted = alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.38 : 0.42);



  return (

    <Box

      sx={{

        ...itemSx,

        height: "100%",

        minHeight: 0,

        minWidth: 0,

        display: "flex",

        flexDirection: "column",

      }}

    >

      <Box sx={{ flexShrink: 0, px: compact ? 1 : 1.5, pt: compact ? 0.5 : 1, pb: 0.25 }}>

        <PanelCapabilityAreaLine cap={cap} />

      </Box>

      <CardActionArea

        onClick={() => toggle()}

        disabled={busy || !cap.hasCommand}

        sx={{ flex: 1, minHeight: 0, p: compact ? 1 : 1.5, pt: compact ? 0.5 : 0.75 }}

      >

        <Stack

          spacing={compact ? 0.5 : 1}

          alignItems="center"

          justifyContent="center"

          sx={{ flex: 1, height: "100%", minHeight: 0 }}

        >

          <PowerSettingsNewOutlinedIcon

            sx={{ fontSize: compact ? 26 : 32, color: on ? accent : muted }}

          />

          <Typography

            variant={compact ? "caption" : "body2"}

            fontWeight={600}

            textAlign="center"

            noWrap

            sx={{ width: "100%" }}

          >

            {cap.name}

          </Typography>

          <Switch

            size="small"

            checked={on}

            disabled={busy || !cap.hasCommand}

            onClick={(e) => e.stopPropagation()}

            onChange={() => toggle()}

          />

          {error && (

            <Typography variant="caption" color="error" textAlign="center">

              {error}

            </Typography>

          )}

        </Stack>

      </CardActionArea>

    </Box>

  );

}



type Props = {

  capabilities: ResolvedPanelCapability[];

  layout?: PanelAppearanceLayout;

};



export function ControlsPanel({ capabilities, layout = "card" }: Props) {

  const switches = controlsActionCapabilities(capabilities);

  const compact = switches.length === 1;



  if (switches.length === 0) {

    return (

      <Typography color="text.secondary">

        No controls in this scope. Add a relay device, assign an Area, then sync capabilities.

      </Typography>

    );

  }



  return (

    <PanelItemGrid

      layout={layout}

      rowSize={compact ? "fluid" : "tall"}

      itemCount={switches.length}

    >

      {switches.map((cap) => (

        <ControlTile key={cap.id} cap={cap} compact={compact} />

      ))}

    </PanelItemGrid>

  );

}


