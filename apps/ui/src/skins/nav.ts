import type { ComponentType } from "react";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import DevicesRoundedIcon from "@mui/icons-material/DevicesRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import type { PermissionKey, RolePermissions } from "../lib/permissions";
import { hasPermission } from "../lib/permissions";

export type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ fontSize?: "inherit" | "large" | "medium" | "small" }>;
  /** If true, only show when signed in */
  auth?: boolean;
  /** Required permission to see this item */
  permission?: PermissionKey;
};

export const MAIN_NAV: NavItem[] = [
  {
    label: "Dashboards",
    to: "/",
    icon: DashboardRoundedIcon,
    auth: true,
    permission: "viewDashboards",
  },
  {
    label: "Live",
    to: "/live",
    icon: SensorsRoundedIcon,
    auth: true,
    permission: "viewLive",
  },
  {
    label: "System",
    to: "/admin/system",
    icon: SettingsRoundedIcon,
    auth: true,
    permission: "viewSystem",
  },
  {
    label: "Areas",
    to: "/admin/areas",
    icon: PlaceRoundedIcon,
    auth: true,
    permission: "viewAreas",
  },
  {
    label: "Devices",
    to: "/admin/devices",
    icon: DevicesRoundedIcon,
    auth: true,
    permission: "viewDevices",
  },
  {
    label: "Users",
    to: "/admin/users",
    icon: PeopleRoundedIcon,
    auth: true,
    permission: "manageUsers",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Troubleshoot", to: "/troubleshoot", icon: BugReportRoundedIcon },
];

export function filterNav(
  items: NavItem[],
  opts: {
    signedIn: boolean;
    isAdmin: boolean;
    permissions?: RolePermissions | null;
  }
): NavItem[] {
  return items.filter((item) => {
    if (item.auth && !opts.signedIn) return false;
    if (item.permission) {
      return hasPermission(opts.permissions, item.permission, opts.isAdmin);
    }
    return true;
  });
}
