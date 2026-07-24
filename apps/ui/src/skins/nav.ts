import type { ComponentType } from "react";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";

export type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ fontSize?: "inherit" | "large" | "medium" | "small" }>;
  /** If true, only show when signed in */
  auth?: boolean;
  /** If true, only show for admin */
  admin?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  { label: "Dashboards", to: "/dashboards", icon: DashboardRoundedIcon, auth: true },
  { label: "Live", to: "/live", icon: SensorsRoundedIcon, auth: true },
  { label: "System", to: "/admin/system", icon: SettingsRoundedIcon, auth: true },
  { label: "Areas", to: "/admin/areas", icon: PlaceRoundedIcon, auth: true },
  { label: "Devices", to: "/admin/devices", icon: DevicesRoundedIcon, auth: true },
  { label: "Users", to: "/admin/users", icon: PeopleRoundedIcon, auth: true, admin: true },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Troubleshoot", to: "/troubleshoot", icon: BugReportRoundedIcon },
];

export function filterNav(
  items: NavItem[],
  opts: { signedIn: boolean; isAdmin: boolean }
): NavItem[] {
  return items.filter((item) => {
    if (item.auth && !opts.signedIn) return false;
    if (item.admin && !opts.isAdmin) return false;
    return true;
  });
}
