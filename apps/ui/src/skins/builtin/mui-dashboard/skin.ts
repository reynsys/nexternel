import type { UiSkin } from "../../types";
import { MuiDashboardLayout } from "./Layout";
import { createMuiDashboardTheme } from "./theme";

export const muiDashboardSkin: UiSkin = {
  id: "mui-dashboard",
  label: "MUI Dashboard",
  description:
    "Free Material UI dashboard shell (side menu) adapted from MUI getting-started templates.",
  createTheme: createMuiDashboardTheme,
  Layout: MuiDashboardLayout,
};

export default muiDashboardSkin;
