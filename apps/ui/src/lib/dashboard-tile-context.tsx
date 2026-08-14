import { createContext, useContext } from "react";

export type DashboardTileChrome = {
  /** When false, widget bodies must not render their own headings (tile chrome owns titles). */
  showBodyHeading: boolean;
};

const defaultChrome: DashboardTileChrome = { showBodyHeading: true };

export const DashboardTileContext = createContext<DashboardTileChrome>(defaultChrome);

export function useDashboardTileChrome(): DashboardTileChrome {
  return useContext(DashboardTileContext);
}
