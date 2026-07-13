"use client";

import { useCallback, useEffect, useState } from "react";

export function useRelayToggle(relayId: string, initialState?: string | null) {
  const [state, setState] = useState<string | null>(initialState ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setState(initialState ?? null);
  }, [initialState, relayId]);

  const setRelayState = useCallback(
    async (newState: "ON" | "OFF") => {
      setLoading(true);
      try {
        const res = await fetch(`/api/relays/${relayId}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: newState }),
        });
        if (res.ok) setState(newState);
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
