import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  connectLiveSocket,
  recordLiveCapabilityState,
  type ResolvedPanelCapability,
} from "../api";
import type { PanelScopeConfig } from "../lib/panel-scope";
import { effectivePanelScope } from "../lib/panel-scope";
import { normalizePanelKind } from "../lib/panel-kind";
import { isIntegrationPanelKind } from "../lib/panel-integration";

export function useResolvedPanel(
  panelKind: string,
  panelScope: PanelScopeConfig,
  sectionAreaId?: string | null
): {
  capabilities: ResolvedPanelCapability[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [capabilities, setCapabilities] = useState<ResolvedPanelCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedScope = useMemo(
    () => effectivePanelScope(panelScope, sectionAreaId ?? null),
    [panelScope, sectionAreaId]
  );
  const scopeKey = `${resolvedScope.contentMode}|${resolvedScope.areaIds.join(",")}|${resolvedScope.systemIds.join(",")}|${resolvedScope.groupIds.join(",")}|${resolvedScope.capabilityIds.join(",")}`;

  const load = useCallback(async () => {
    if (isIntegrationPanelKind(normalizePanelKind(panelKind))) {
      setCapabilities([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.v4ResolvePanel({
        panelKind,
        panelScope: resolvedScope,
      });
      setCapabilities(result.capabilities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load panel");
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  }, [panelKind, scopeKey, resolvedScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const capabilityWatchKey = useMemo(
    () =>
      capabilities
        .map((c) => c.id)
        .sort()
        .join(","),
    [capabilities]
  );

  useEffect(() => {
    const ids = new Set(capabilities.map((c) => c.id));
    if (ids.size === 0) return undefined;

    return connectLiveSocket((ev) => {
      if (ev.type === "hello" && ev.states) {
        setCapabilities((prev) =>
          prev.map((c) => {
            const live = ev.states!.find((s) => s.capabilityId === c.id);
            if (!live) return c;
            recordLiveCapabilityState(
              live.capabilityId,
              live.value,
              live.quality,
              live.updatedAt
            );
            return {
              ...c,
              state: {
                value: live.value,
                quality: live.quality,
                updatedAt: live.updatedAt,
              },
            };
          })
        );
        return;
      }
      if (ev.type === "capability.updated" && ev.state && ids.has(ev.state.capabilityId)) {
        const { capabilityId, value, quality, updatedAt } = ev.state;
        recordLiveCapabilityState(capabilityId, value, quality, updatedAt);
        setCapabilities((prev) =>
          prev.map((c) =>
            c.id === capabilityId
              ? { ...c, state: { value, quality, updatedAt } }
              : c
          )
        );
      }
    });
  }, [capabilityWatchKey]);

  return { capabilities, loading, error, reload: load };
}
