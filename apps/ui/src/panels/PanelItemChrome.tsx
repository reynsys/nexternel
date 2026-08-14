import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { Capability, ResolvedPanelCapability } from "../api";
import { panelContentRootSx } from "../components/DashboardTileBody";
import { PanelItemContextLine } from "./PanelCapabilityAreaLine";
import { panelItemContextLine } from "./panel-item-context";

type Props = {
  cap?: Capability | ResolvedPanelCapability;
  /** Override computed context (e.g. camera area name). */
  contextLabel?: string | null;
  /** Optional second line — omit on gauges when the tile title already names the item. */
  title?: string | null;
  /** When false, skip the context caption entirely. */
  showContext?: boolean;
  children: ReactNode;
  itemSx?: SxProps<Theme>;
  compact?: boolean;
  contentSx?: SxProps<Theme>;
};

/**
 * Minimal shared chrome: one optional context caption, one optional title, then content.
 * Prefer a single caption line — do not stack area · device and a full title.
 */
export function PanelItemChrome({
  cap,
  contextLabel,
  title,
  showContext = true,
  children,
  itemSx,
  compact = false,
  contentSx,
}: Props) {
  const context =
    contextLabel !== undefined
      ? contextLabel
      : cap
        ? panelItemContextLine(cap)
        : null;
  const contextText = showContext ? context?.trim() || null : null;
  const titleText = title?.trim() || null;

  return (
    <Box
      sx={{
        ...itemSx,
        ...panelContentRootSx({
          p: compact ? 1 : 1.25,
          gap: 0.5,
        }),
      }}
    >
      {contextText ? <PanelItemContextLine label={contextText} /> : null}
      {titleText ? (
        <Typography
          variant="body2"
          fontWeight={600}
          noWrap
          sx={{ flexShrink: 0, width: "100%", textAlign: "left" }}
          title={titleText}
        >
          {titleText}
        </Typography>
      ) : null}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          mt: contextText || titleText ? 0.25 : 0,
          ...contentSx,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
