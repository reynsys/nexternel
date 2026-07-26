import { Link as RouterLink, Outlet } from "react-router-dom";
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

/** Flat top-nav shell (original V3 look). */
export function ClassicLayout() {
  const { signedIn, user, isAdmin, permissions, logout } = useShellAuth();
  const main = filterNav(MAIN_NAV, { signedIn, isAdmin, permissions });
  const secondary = filterNav(SECONDARY_NAV, { signedIn, isAdmin, permissions });

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
            {[...main, ...secondary].map((item) => (
              <Link
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                underline="hover"
              >
                {item.label}
              </Link>
            ))}
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
