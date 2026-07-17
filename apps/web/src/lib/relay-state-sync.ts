"use client";

/**
 * Shared poll of all relay lastState values so every switch on every open
 * dashboard stays in sync (one request, many subscribers).
 */

type RelayStateRow = { id: string; lastState: string | null };
type Listener = (states: Map<string, string | null>) => void;

const listeners = new Set<Listener>();
let cache = new Map<string, string | null>();
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<void> | null = null;

const POLL_MS = 4_000;

async function fetchStates() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/relays/states", { cache: "no-store" });
      if (!res.ok) return;
      const rows = (await res.json()) as RelayStateRow[];
      if (!Array.isArray(rows)) return;
      const next = new Map<string, string | null>();
      for (const row of rows) {
        if (row?.id) next.set(row.id, row.lastState ?? null);
      }
      cache = next;
      listeners.forEach((fn) => fn(cache));
    } catch {
      /* ignore */
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function ensurePolling() {
  if (timer != null) return;
  void fetchStates();
  timer = setInterval(() => {
    void fetchStates();
  }, POLL_MS);
}

function stopPollingIfIdle() {
  if (listeners.size > 0 || timer == null) return;
  clearInterval(timer);
  timer = null;
}

/** Subscribe to the shared relay-state map. Returns unsubscribe. */
export function subscribeRelayStates(listener: Listener): () => void {
  listeners.add(listener);
  ensurePolling();
  listener(cache);
  return () => {
    listeners.delete(listener);
    stopPollingIfIdle();
  };
}

/** Optimistic update after a local toggle (before the next poll). */
export function publishRelayState(relayId: string, state: string | null) {
  cache.set(relayId, state);
  listeners.forEach((fn) => fn(cache));
}
