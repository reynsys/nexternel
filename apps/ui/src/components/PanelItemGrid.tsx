import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Children, isValidElement, type ReactNode } from "react";
import { panelContentRootSx } from "./DashboardTileBody";
import {
  panelItemGridSx,
  type PanelAppearanceLayout,
  type PanelItemGridRowSize,
} from "../lib/panel-item-grid";

type Props = {
  layout?: PanelAppearanceLayout;
  rowSize?: PanelItemGridRowSize;
  /** When omitted, counts valid React children. */
  itemCount?: number;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  rootSx?: SxProps<Theme>;
  gridSx?: SxProps<Theme>;
};

function countGridChildren(children: ReactNode): number {
  return Children.toArray(children).filter(isValidElement).length;
}

/** Shared grid for Status, Controls, Charts, Camera, and future multi-item panels. */
export function PanelItemGrid({
  layout = "card",
  rowSize = "standard",
  itemCount,
  header,
  footer,
  children,
  rootSx,
  gridSx,
}: Props) {
  const count = itemCount ?? countGridChildren(children);
  return (
    <Box sx={panelContentRootSx(rootSx)}>
      {header}
      <Box sx={{ ...panelItemGridSx({ layout, rowSize, itemCount: count }), ...gridSx }}>
        {children}
      </Box>
      {footer}
    </Box>
  );
}
