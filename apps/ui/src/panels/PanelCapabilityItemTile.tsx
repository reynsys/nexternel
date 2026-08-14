import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { ResolvedPanelCapability } from "../api";
import { capabilityOptionPrimary } from "../lib/capability-picker";
import { asSwitchCapability } from "./panel-capabilities";
import { PanelCapabilityAreaLine } from "./PanelCapabilityAreaLine";

type Props = {
  cap: ResolvedPanelCapability;
  children: ReactNode;
  itemSx?: SxProps<Theme>;
};

/**
 * Status (and similar) tiles: entity name top, value centre, area bottom-left.
 */
export function PanelCapabilityItemTile({ cap, children, itemSx }: Props) {
  const title = capabilityOptionPrimary(asSwitchCapability(cap));
  return (
    <Box
      sx={{
        ...itemSx,
        p: 1.25,
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        containerType: "size",
      }}
    >
      <Typography
        variant="caption"
        fontWeight={600}
        color="text.secondary"
        noWrap
        sx={{ flexShrink: 0, width: "100%", textAlign: "left" }}
        title={title}
      >
        {title}
      </Typography>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 0.5,
        }}
      >
        {children}
      </Box>
      <PanelCapabilityAreaLine cap={cap} />
    </Box>
  );
}
