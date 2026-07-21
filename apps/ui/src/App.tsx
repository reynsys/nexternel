import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardsPage } from "./pages/DashboardsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LivePage } from "./pages/LivePage";
import { TroubleshootPage } from "./pages/TroubleshootPage";
import { SystemPage } from "./pages/admin/SystemPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { RoomsPage } from "./pages/admin/RoomsPage";
import { DevicesPage } from "./pages/admin/DevicesPage";
import { api, getStoredAccessToken, type User } from "./api";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getStoredAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    void api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;
  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboards" replace />;
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/troubleshoot" element={<TroubleshootPage />} />
        <Route
          path="/dashboards"
          element={
            <RequireAuth>
              <DashboardsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/live"
          element={
            <RequireAuth>
              <LivePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/system"
          element={
            <RequireAuth>
              <SystemPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth>
              <RequireAdmin>
                <UsersPage />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/rooms"
          element={
            <RequireAuth>
              <RoomsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/devices"
          element={
            <RequireAuth>
              <DevicesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <Navigate
              to={getStoredAccessToken() ? "/dashboards" : "/login"}
              replace
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
