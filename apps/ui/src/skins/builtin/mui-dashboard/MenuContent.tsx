import { Link as RouterLink, useLocation } from "react-router-dom";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import {
  filterNav,
  MAIN_NAV,
  SECONDARY_NAV,
  type NavItem,
} from "../../nav";

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
  onNavigate?: () => void;
};

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <List dense>
      {items.map((item) => {
        const Icon = item.icon;
        const selected =
          item.to === "/"
            ? pathname === "/" || pathname.startsWith("/dashboards")
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <ListItem key={item.to} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              component={RouterLink}
              to={item.to}
              selected={selected}
              onClick={onNavigate}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

export function MenuContent({ signedIn, isAdmin, onNavigate }: Props) {
  const { pathname } = useLocation();
  const main = filterNav(MAIN_NAV, { signedIn, isAdmin });
  const secondary = filterNav(SECONDARY_NAV, { signedIn, isAdmin });

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <NavList items={main} pathname={pathname} onNavigate={onNavigate} />
      <NavList items={secondary} pathname={pathname} onNavigate={onNavigate} />
    </Stack>
  );
}
