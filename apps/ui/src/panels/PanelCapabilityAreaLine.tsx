import { Typography } from "@mui/material";
import type { ResolvedPanelCapability } from "../api";
import { panelItemContextLine } from "./panel-item-context";

const areaLineSx = {
  flexShrink: 0,
  width: "100%",
  textAlign: "left",
  alignSelf: "flex-start",
} as const;

/** Secondary location line for a panel capability tile (area / device context). */
export function panelCapabilityLocationLabel(cap: ResolvedPanelCapability): string {
  return panelItemContextLine(cap);
}

/** Plain context line — same placement as capability area labels. */
export function PanelItemContextLine({ label }: { label: string | null | undefined }) {
  const text = label?.trim();
  if (!text) return null;

  return (
    <Typography variant="caption" color="text.secondary" noWrap sx={areaLineSx}>
      {text}
    </Typography>
  );
}

/**
 * Area / location caption — always top-left of a panel item tile.
 * Used by Controls, Status, Charts, Camera, gauges, and other panel items.
 */
export function PanelCapabilityAreaLine({ cap }: { cap: ResolvedPanelCapability }) {
  return <PanelItemContextLine label={panelCapabilityLocationLabel(cap)} />;
}
