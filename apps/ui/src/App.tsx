import { useEffect, useState, type ReactNode } from "react";
import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardsPage } from "./pages/DashboardsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TroubleshootPage } from "./pages/TroubleshootPage";
import { SettingsLayout } from "./pages/admin/settings/SettingsLayout";
import { SettingsIndexRedirect } from "./pages/admin/settings/SettingsIndexRedirect";
import { AppearanceSettingsPage } from "./pages/admin/settings/AppearanceSettingsPage";
import { SystemStatusPage } from "./pages/admin/settings/SystemStatusPage";
import { BackupSettingsPage } from "./pages/admin/settings/BackupSettingsPage";
import { AutomationsSettingsPage } from "./pages/admin/settings/AutomationsSettingsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { AreasPage } from "./pages/admin/AreasPage";
import { DevicesPage } from "./pages/admin/DevicesPage";
import { CamerasPage } from "./pages/admin/CamerasPage";
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

  if (user === undefined) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }
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
        <Button component={RouterLink} to="/admin/users" variant="contained">
          Open Users
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
                <DashboardPage />
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
                <DashboardPage />
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

        <Route path="live" element={<Navigate to="/" replace />} />

        <Route
          path="admin/settings"
          element={
            <RequireAuth>
              <SettingsLayout />
            </RequireAuth>
          }
        >
          <Route index element={<SettingsIndexRedirect />} />
          <Route
            path="appearance"
            element={
              <RequirePermission permission="viewSystem">
                <AppearanceSettingsPage />
              </RequirePermission>
            }
          />
          <Route
            path="system"
            element={
              <RequirePermission permission="viewSystem">
                <SystemStatusPage />
              </RequirePermission>
            }
          />
          <Route
            path="backup"
            element={
              <RequirePermission permission="manageUsers">
                <BackupSettingsPage />
              </RequirePermission>
            }
          />
          <Route
            path="automations"
            element={
              <RequirePermission permission="viewSystem">
                <AutomationsSettingsPage />
              </RequirePermission>
            }
          />
        </Route>

        <Route path="admin/system" element={<Navigate to="/admin/settings/system" replace />} />
        <Route path="admin/profile" element={<Navigate to="/admin/users" replace />} />

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
        <Route
          path="admin/cameras"
          element={
            <RequireAuth>
              <RequirePermission permission="viewDevices">
                <CamerasPage />
              </RequirePermission>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
