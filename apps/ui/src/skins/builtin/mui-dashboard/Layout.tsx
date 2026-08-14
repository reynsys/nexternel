import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { Outlet } from "react-router-dom";
import { VisualDiagOverlay } from "../../../diagnostics/VisualDiagOverlay";
import { useShellAuth } from "../../useShellAuth";
import { useSkin } from "../../SkinProvider";
import { gradientCss } from "../../gradientPalettes";
import { SideMenu, useSideMenuCollapsed } from "./SideMenu";
import { AppNavbar } from "./AppNavbar";

/** Free MUI dashboard-style shell: permanent side menu + mobile app bar. */
export function MuiDashboardLayout() {
  const { signedIn, user, isAdmin, permissions, authLoading, logout } = useShellAuth();
  const [collapsed, setCollapsed] = useSideMenuCollapsed();
  const { themePrefs } = useSkin();
  const hasGradient = Boolean(gradientCss(themePrefs.gradientId));

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <SideMenu
        signedIn={signedIn}
        isAdmin={isAdmin}
        permissions={permissions}
        authLoading={authLoading}
        user={user ?? null}
        onLogout={() => void logout()}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <AppNavbar
        signedIn={signedIn}
        isAdmin={isAdmin}
        permissions={permissions}
        authLoading={authLoading}
        user={user ?? null}
        onLogout={() => void logout()}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: hasGradient ? "transparent" : "background.default",
          overflow: "auto",
          minWidth: 0,
        }}
      >
        <Stack
          spacing={2}
          sx={{
            mx: { xs: 2, md: 3 },
            pb: 5,
            pt: { xs: 10, md: 3 },
            maxWidth: 1400,
          }}
        >
          <Outlet />
        </Stack>
      </Box>
      <VisualDiagOverlay />
    </Box>
  );
}
