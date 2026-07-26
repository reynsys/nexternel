import { useEffect, useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Link as RouterLink } from "react-router-dom";
import { APP_VERSION } from "../../../version";
import { MenuContent } from "./MenuContent";
import type { User } from "../../../api";
import type { RolePermissions } from "../../../lib/permissions";
import {
  fileToBrandLogoDataUrl,
  getBrandLogo,
  setBrandLogo,
} from "../../brandLogo";
import {
  getSideMenuCollapsed,
  setSideMenuCollapsed,
  SIDE_MENU_WIDTH_COLLAPSED,
  SIDE_MENU_WIDTH_EXPANDED,
} from "../../sideMenuPrefs";

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
  permissions?: RolePermissions | null;
  user: User | null;
  onLogout: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function BrandMark({
  logo,
  canEdit,
  onLogoChange,
  size = 28,
}: {
  logo: string | null;
  canEdit: boolean;
  onLogoChange: (next: string | null) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToBrandLogoDataUrl(file);
      setBrandLogo(dataUrl);
      onLogoChange(dataUrl);
    } catch {
      /* ignore */
    }
  }

  const mark = logo ? (
    <Box
      component="img"
      src={logo}
      alt="Brand"
      sx={{
        width: size,
        height: size,
        borderRadius: "999px",
        objectFit: "cover",
        border: "1px solid",
        borderColor: "divider",
        display: "block",
      }}
    />
  ) : (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "999px",
        backgroundImage:
          "linear-gradient(135deg, hsl(210, 98%, 60%) 0%, hsl(210, 100%, 35%) 100%)",
        border: "1px solid",
        borderColor: "primary.main",
        flexShrink: 0,
      }}
    />
  );

  if (!canEdit) return mark;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        hidden
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Tooltip title="Change logo — click to upload, right-click to reset">
        <Box
          component="button"
          type="button"
          onClick={() => inputRef.current?.click()}
          onContextMenu={(e) => {
            e.preventDefault();
            setBrandLogo(null);
            onLogoChange(null);
          }}
          sx={{
            p: 0,
            border: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            lineHeight: 0,
            borderRadius: "999px",
          }}
        >
          {mark}
        </Box>
      </Tooltip>
    </>
  );
}

export function SideMenu({
  signedIn,
  isAdmin,
  permissions,
  user,
  onLogout,
  collapsed,
  onCollapsedChange,
}: Props) {
  const [logo, setLogo] = useState<string | null>(() => getBrandLogo());
  const width = collapsed ? SIDE_MENU_WIDTH_COLLAPSED : SIDE_MENU_WIDTH_EXPANDED;
  const canEditLogo = Boolean(isAdmin || permissions?.manageUsers);

  useEffect(() => {
    function refresh() {
      setLogo(getBrandLogo());
    }
    window.addEventListener("nexternel:brand-logo-updated", refresh);
    return () => window.removeEventListener("nexternel:brand-logo-updated", refresh);
  }, []);

  return (
    <MuiDrawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width,
        flexShrink: 0,
        [`& .${drawerClasses.paper}`]: {
          width,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          overflowX: "hidden",
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2,
          justifyContent: collapsed ? "center" : "flex-start",
          minHeight: 64,
        }}
      >
        <BrandMark
          logo={logo}
          canEdit={canEditLogo}
          onLogoChange={setLogo}
          size={collapsed ? 32 : 28}
        />
        {!collapsed && (
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Nexternel
          </Typography>
        )}
      </Box>
      <Divider />
      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent
          signedIn={signedIn}
          isAdmin={isAdmin}
          permissions={permissions}
          collapsed={collapsed}
        />
      </Box>

      <Stack
        spacing={collapsed ? 1 : 0.5}
        sx={{
          p: collapsed ? 1 : 2,
          borderTop: "1px solid",
          borderColor: "divider",
          alignItems: collapsed ? "center" : "stretch",
        }}
      >
        {signedIn ? (
          collapsed ? (
            <>
              <Tooltip
                title={user?.displayName?.trim() || user?.username || "User"}
                placement="right"
              >
                <Avatar
                  src={user?.avatarData ?? undefined}
                  sx={{ width: 36, height: 36, bgcolor: "primary.dark" }}
                >
                  {(user?.displayName || user?.username || "?")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </Avatar>
              </Tooltip>
              <Tooltip title={APP_VERSION} placement="right">
                <Typography variant="caption" color="text.secondary" noWrap>
                  {APP_VERSION.replace(/^V/, "")}
                </Typography>
              </Tooltip>
              <Tooltip title="Expand menu" placement="right">
                <IconButton
                  size="small"
                  onClick={() => onCollapsedChange(false)}
                  aria-label="Expand menu"
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sign out" placement="right">
                <Button size="small" onClick={onLogout} sx={{ minWidth: 0, px: 1 }}>
                  Out
                </Button>
              </Tooltip>
            </>
          ) : (
            <>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  src={user?.avatarData ?? undefined}
                  sx={{ width: 36, height: 36, bgcolor: "primary.dark" }}
                >
                  {(user?.displayName || user?.username || "?")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </Avatar>
                <Box sx={{ mr: "auto", minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, lineHeight: "16px" }}
                    noWrap
                  >
                    {user?.displayName?.trim() || user?.username || "User"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user?.roleName ||
                      (user?.role === "admin"
                        ? "Administrator"
                        : user?.role === "viewer"
                          ? "Viewer"
                          : (user?.role ?? ""))}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    noWrap
                  >
                    {APP_VERSION}
                  </Typography>
                </Box>
                <Button size="small" onClick={onLogout}>
                  Out
                </Button>
              </Stack>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Tooltip title="Collapse menu (icons only)">
                  <IconButton
                    size="small"
                    onClick={() => onCollapsedChange(true)}
                    aria-label="Collapse menu"
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )
        ) : (
          <Button component={RouterLink} to="/login" size="small" fullWidth>
            {collapsed ? "In" : "Login"}
          </Button>
        )}
      </Stack>
    </MuiDrawer>
  );
}

export function useSideMenuCollapsed() {
  const [collapsed, setCollapsed] = useState(() => getSideMenuCollapsed());
  function set(next: boolean) {
    setSideMenuCollapsed(next);
    setCollapsed(next);
  }
  return [collapsed, set] as const;
}
