import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

/**
 * Dashboard tile content slot — sits below the tile title row inside SectionGrid.
 *
 * Sizing chain (do not break):
 *   .react-grid-item > div  →  tile Paper (flex column, h:100%)
 *   →  SectionGrid body Box  →  DashboardTileBody  →  panel / widget root
 */
export function dashboardTileBodySx(extra?: SxProps<Theme>): SxProps<Theme> {
  return {
    flex: 1,
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    ...(extra as object),
  };
}

/** Same flex contract for panel/widget roots rendered inside DashboardTileBody. */
export function panelContentRootSx(extra?: SxProps<Theme>): SxProps<Theme> {
  return {
    flex: 1,
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    ...(extra as object),
  };
}

type Props = {
  widgetId?: string;
  widgetType?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

export function DashboardTileBody({ widgetId, widgetType, children, sx }: Props) {
  return (
    <Box
      data-nx-widget={widgetId}
      data-nx-widget-type={widgetType}
      sx={dashboardTileBodySx(sx)}
    >
      {children}
    </Box>
  );
}
