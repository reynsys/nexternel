import { useEffect, useState } from "react";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
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
import { api, clearStoredTokens, getStoredAccessToken, type User } from "../api";
import { APP_VERSION } from "../version";
import { VisualDiagOverlay } from "../diagnostics/VisualDiagOverlay";

export function AppLayout() {
  const navigate = useNavigate();
  const signedIn = Boolean(getStoredAccessToken());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setUser(null);
      return;
    }
    void api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, [signedIn]);

  async function logout() {
    try {
      await api.logout();
    } finally {
      clearStoredTokens();
      setUser(null);
      navigate("/login");
    }
  }

  const isAdmin = user?.role === "admin";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" elevation={0} color="transparent">
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
            Nexternel {APP_VERSION}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }} flexWrap="wrap" useFlexGap>
            {signedIn && (
              <>
                <Link component={RouterLink} to="/dashboards" color="inherit" underline="hover">
                  Dashboards
                </Link>
                <Link component={RouterLink} to="/live" color="inherit" underline="hover">
                  Live
                </Link>
                <Link component={RouterLink} to="/admin/system" color="inherit" underline="hover">
                  System
                </Link>
                <Link component={RouterLink} to="/admin/rooms" color="inherit" underline="hover">
                  Rooms
                </Link>
                <Link component={RouterLink} to="/admin/devices" color="inherit" underline="hover">
                  Devices
                </Link>
                {isAdmin && (
                  <Link component={RouterLink} to="/admin/users" color="inherit" underline="hover">
                    Users
                  </Link>
                )}
              </>
            )}
            <Link component={RouterLink} to="/troubleshoot" color="inherit" underline="hover">
              Troubleshoot
            </Link>
          </Stack>
          {signedIn ? (
            <Button color="inherit" size="small" onClick={() => void logout()}>
              Sign out{user ? ` (${user.username})` : ""}
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
