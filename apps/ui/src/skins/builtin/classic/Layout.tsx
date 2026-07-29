import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { APP_VERSION } from "../../../version";
import { VisualDiagOverlay } from "../../../diagnostics/VisualDiagOverlay";
import { filterNav, MAIN_NAV, SECONDARY_NAV } from "../../nav";
import { useShellAuth } from "../../useShellAuth";
import { useSkin } from "../../SkinProvider";
import { gradientCss } from "../../gradientPalettes";

function navItemActive(pathname: string, to: string): boolean {
  if (to === "/") {
    return (
      pathname === "/" ||
      pathname.startsWith("/dashboards") ||
      pathname.startsWith("/manage/dashboards")
    );
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Flat top-nav shell (original V3 look). */
export function ClassicLayout() {
  const { signedIn, user, isAdmin, permissions, logout } = useShellAuth();
  const { themePrefs } = useSkin();
  const { pathname } = useLocation();
  const hasGradient = Boolean(gradientCss(themePrefs.gradientId));
  const main = filterNav(MAIN_NAV, { signedIn, isAdmin, permissions });
  const secondary = filterNav(SECONDARY_NAV, { signedIn, isAdmin, permissions });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: hasGradient ? "transparent" : "background.default",
      }}
    >
      <AppBar position="static" elevation={0} color="transparent">
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
            Nexternel {APP_VERSION}
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexGrow: 1 }}
            flexWrap="wrap"
            useFlexGap
          >
            {[...main, ...secondary].map((item) => {
              const active = navItemActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  underline={active ? "always" : "hover"}
                  className={active ? "nexternel-nav-active" : undefined}
                  color={active ? "primary" : "inherit"}
                  sx={{
                    fontWeight: active ? 700 : 500,
                    borderBottom: active ? "2px solid" : "2px solid transparent",
                    borderColor: active ? "primary.main" : "transparent",
                    pb: 0.25,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </Stack>
          {signedIn ? (
            <Button color="inherit" size="small" onClick={() => void logout()}>
              Sign out
              {user
                ? ` (${user.displayName?.trim() || user.username})`
                : ""}
            </Button>
          ) : (
            <Link component={RouterLink} to="/login" color="inherit" underline="hover">
              Login
            </Link>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3, flex: 1 }}>
        <Outlet />
      </Container>
      <VisualDiagOverlay />
    </Box>
  );
}
