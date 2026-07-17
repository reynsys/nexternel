"use client";

import { useCallback, useEffect, useState } from "react";
import { publishRelayState, subscribeRelayStates } from "@/lib/relay-state-sync";

export function useRelayToggle(relayId: string, initialState?: string | null) {
  const [state, setState] = useState<string | null>(initialState ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setState(initialState ?? null);
  }, [initialState, relayId]);

  // Keep in sync with other browsers / MQTT-updated DB state
  useEffect(() => {
    return subscribeRelayStates((map) => {
      if (!map.has(relayId)) return;
      const next = map.get(relayId) ?? null;
      setState((prev) => (prev === next ? prev : next));
    });
  }, [relayId]);

  const setRelayState = useCallback(
    async (newState: "ON" | "OFF") => {
      setLoading(true);
      try {
        const res = await fetch(`/api/relays/${relayId}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: newState }),
        });
        if (res.ok) {
          setState(newState);
          publishRelayState(relayId, newState);
        }
      } finally {
        setLoading(false);
      }
    },
    [relayId]
  );

  const toggle = useCallback(async () => {
    await setRelayState(state === "ON" ? "OFF" : "ON");
  }, [setRelayState, state]);

  return {
    state,
    loading,
    isOn: state === "ON",
    toggle,
    setRelayState,
  };
}
