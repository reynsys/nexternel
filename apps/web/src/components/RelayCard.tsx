"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { publishRelayState, subscribeRelayStates } from "@/lib/relay-state-sync";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";

interface RelayCardProps {
  relayId: string;
  name: string;
  deviceName: string;
  roomName?: string | null;
  initialState?: string | null;
}

export function RelayCard({
  relayId,
  name,
  roomName,
  initialState,
  rowSpan = 1,
}: RelayCardProps & { rowSpan?: number }) {
  const [state, setState] = useState<string | null>(initialState ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setState(initialState ?? null);
  }, [initialState, relayId]);

  useEffect(() => {
    return subscribeRelayStates((map) => {
      if (!map.has(relayId)) return;
      const next = map.get(relayId) ?? null;
      setState((prev) => (prev === next ? prev : next));
    });
  }, [relayId]);

  async function toggle() {
    setLoading(true);
    const newState = state === "ON" ? "OFF" : "ON";
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
  }

  const isOn = state === "ON";

  return (
    <div
      className={cn(
        "card flex h-full min-h-0 flex-col gap-2 text-center",
        rowSpan > 1 ? "justify-center" : "justify-start"
      )}
    >
      <p className="widget-fit-body text-muted-foreground">
        {roomName || "Unassigned"}
      </p>
      <WidgetTitleBar title={`⚡ ${name}`} />
      <span className={isOn ? "badge-online" : "badge-offline"}>{state || "Unknown"}</span>
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative mt-1 h-8 w-16 shrink-0 rounded-full transition-colors ${
          isOn ? "bg-[var(--success)]" : "bg-muted"
        } ${loading ? "opacity-50" : ""}`}
        aria-label={`Toggle ${name}`}
      >
        <span
          className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform ${
            isOn ? "left-8" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
