import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { Capability, WidgetInstance } from "../../api";
import { panelContentRootSx } from "../../components/DashboardTileBody";
import { PanelItemContextLine } from "../../panels/PanelCapabilityAreaLine";
import { panelItemContextLine } from "../../panels/panel-item-context";

type Props = {
  widget: WidgetInstance;
  cap: Capability | undefined;
  children: ReactNode;
};

/**
 * Gauge tile chrome only — title is in SectionGrid; this adds the optional
 * area/sensor caption row, then the chart host (child) flex-fills the rest.
 * No sizing logic here.
 */
export function GaugeTileFrame({ widget, cap, children }: Props) {
  const tileTitle = widget.title?.trim() || null;
  const dataLabel = cap?.name?.trim() ?? "";
  const context = cap ? panelItemContextLine(cap) : null;
  const caption =
    tileTitle && context
      ? context
      : !tileTitle && dataLabel
        ? dataLabel
        : !tileTitle && context
          ? context
          : null;

  return (
    <Box
      sx={{
        ...panelContentRootSx(),
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {caption ? (
        <Box sx={{ flexShrink: 0, width: "100%", px: 0.25, pb: 0.25 }}>
          {tileTitle && context ? (
            <PanelItemContextLine label={context} />
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              noWrap
              sx={{ display: "block", width: "100%", textAlign: "left" }}
              title={caption}
            >
              {caption}
            </Typography>
          )}
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
