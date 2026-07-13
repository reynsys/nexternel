"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DashboardLayoutSummary } from "@/types/dashboard";

interface DashboardContextValue {
  activeLayoutId: string | null;
  setActiveLayoutId: (id: string) => void;
  layouts: DashboardLayoutSummary[];
  layoutsLoading: boolean;
  layoutsError: string;
  refreshLayouts: () => Promise<void>;
  createLayout: (name: string) => Promise<string | null>;
  updateLayout: (
    id: string,
    patch: Partial<Pick<DashboardLayoutSummary, "name" | "tabIcon" | "showTabLabel">>
  ) => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const STORAGE_KEY = "damnhome-active-layout";

function pickActiveLayoutId(
  data: DashboardLayoutSummary[],
  stored: string | null
): string | null {
  return (
    (stored && data.find((l) => l.id === stored)?.id) ||
    data.find((l) => l.isDefault)?.id ||
    data[0]?.id ||
    null
  );
}

async function fetchDefaultLayoutSummary(): Promise<DashboardLayoutSummary | null> {
  const res = await fetch("/api/dashboard/layout");
  if (!res.ok) return null;
  const layout = await res.json();
  return {
    id: layout.id,
    name: layout.name,
    isDefault: true,
    tabIcon: "layout-dashboard",
    showTabLabel: true,
  };
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [layouts, setLayouts] = useState<DashboardLayoutSummary[]>([]);
  const [activeLayoutId, setActiveLayoutIdState] = useState<string | null>(null);
  const [layoutsLoading, setLayoutsLoading] = useState(true);
  const [layoutsError, setLayoutsError] = useState("");

  const setActiveLayoutId = useCallback((id: string) => {
    setActiveLayoutIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const refreshLayouts = useCallback(async () => {
    setLayoutsLoading(true);
    setLayoutsError("");

    const stored =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

    try {
      const res = await fetch("/api/dashboard/layouts");
      if (res.ok) {
        const data: DashboardLayoutSummary[] = await res.json();
        setLayouts(data);
        const pick = pickActiveLayoutId(data, stored);
        if (pick) setActiveLayoutIdState(pick);
        return;
      }

      const fallback = await fetchDefaultLayoutSummary();
      if (fallback) {
        setLayouts([fallback]);
        setActiveLayoutIdState(fallback.id);
        return;
      }

      setLayoutsError("Could not load dashboards");
    } catch {
      const fallback = await fetchDefaultLayoutSummary();
      if (fallback) {
        setLayouts([fallback]);
        setActiveLayoutIdState(fallback.id);
      } else {
        setLayoutsError("Could not load dashboards");
      }
    } finally {
      setLayoutsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLayouts();
  }, [refreshLayouts]);

  async function createLayout(name: string) {
    const res = await fetch("/api/dashboard/layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const layout = await res.json();
    await refreshLayouts();
    setActiveLayoutId(layout.id);
    return layout.id as string;
  }

  async function updateLayout(
    id: string,
    patch: Partial<Pick<DashboardLayoutSummary, "name" | "tabIcon" | "showTabLabel">>
  ) {
    const res = await fetch(`/api/dashboard/layouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return false;
    const updated: DashboardLayoutSummary = await res.json();
    setLayouts((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    return true;
  }

  return (
    <DashboardContext.Provider
      value={{
        activeLayoutId,
        setActiveLayoutId,
        layouts,
        layoutsLoading,
        layoutsError,
        refreshLayouts,
        createLayout,
        updateLayout,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function useDashboardOptional() {
  return useContext(DashboardContext);
}
