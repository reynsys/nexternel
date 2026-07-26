import { useEffect, useState, type ReactNode } from "react";
import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import { Alert, Button, Stack } from "@mui/material";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardsPage } from "./pages/DashboardsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LivePage } from "./pages/LivePage";
import { TroubleshootPage } from "./pages/TroubleshootPage";
import { SystemPage } from "./pages/admin/SystemPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { AreasPage } from "./pages/admin/AreasPage";
import { DevicesPage } from "./pages/admin/DevicesPage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { api, getStoredAccessToken, type User } from "./api";
import {
  hasPermission,
  type PermissionKey,
} from "./lib/permissions";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getStoredAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequirePermission({
  permission,
  children,
}: {
  permission: PermissionKey;
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void api
      .me()
      .then((r) => {
        setUser(r.user);
        setFailed(false);
      })
      .catch(() => {
        setUser(null);
        setFailed(true);
      });
  }, []);

  if (user === undefined) return null;
  if (failed || !user) {
    return <Navigate to="/login" replace />;
  }
  const ok = hasPermission(
    user.permissions,
    permission,
    Boolean(user.isAdmin ?? user.role === "admin")
  );
  if (!ok) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={2}>
        <Alert severity="warning" sx={{ maxWidth: 480 }}>
          Your account does not have permission to open this page.
        </Alert>
        <Button component={RouterLink} to="/admin/system" variant="contained">
          Open System / profile
        </Button>
      </Stack>
    );
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="troubleshoot" element={<TroubleshootPage />} />

        <Route
          index
          element={
            <RequireAuth>
              <RequirePermission permission="viewDashboards">
                <HomeRedirect />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="dashboards/:id"
          element={
            <RequireAuth>
              <RequirePermission permission="viewDashboards">
                <DashboardPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="dashboards"
          element={
            <RequireAuth>
              <RequirePermission permission="viewDashboards">
                <HomeRedirect />
              </RequirePermission>
            </RequireAuth>
          }
        />

        <Route
          path="manage/dashboards"
          element={
            <RequireAuth>
              <RequirePermission permission="editDashboards">
                <DashboardsPage />
              </RequirePermission>
            </RequireAuth>
          }
        />

        <Route
          path="live"
          element={
            <RequireAuth>
              <RequirePermission permission="viewLive">
                <LivePage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="admin/system"
          element={
            <RequireAuth>
              <RequirePermission permission="viewSystem">
                <SystemPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireAuth>
              <RequirePermission permission="manageUsers">
                <UsersPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="admin/roles"
          element={
            <RequireAuth>
              <RequirePermission permission="manageRoles">
                <RolesPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route
          path="admin/areas"
          element={
            <RequireAuth>
              <RequirePermission permission="viewAreas">
                <AreasPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route path="admin/rooms" element={<Navigate to="/admin/areas" replace />} />
        <Route
          path="admin/devices"
          element={
            <RequireAuth>
              <RequirePermission permission="viewDevices">
                <DevicesPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
