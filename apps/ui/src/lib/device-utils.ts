/** Client-safe device helpers. */

export function formatLastSeen(iso: string | Date | null | undefined): string {
  if (!iso) return "Never";
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs < 60_000) return "Just now";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function esphomeDashboardUrl(hostname: string, esphomeName?: string | null): string {
  const base = `http://${hostname}:6052`;
  if (!esphomeName) return base;
  return `${base}/dashboard/${encodeURIComponent(esphomeName)}`;
}

export function friendlyDeviceName(esphomeName: string): string {
  return esphomeName
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: "Draft",
  configured: "Configured",
  validation_failed: "Validation failed",
  ready_to_build: "Ready to build",
  building: "Building",
  firmware_ready: "Firmware ready",
  awaiting_installation: "Awaiting installation",
  connecting: "Connecting",
  online: "Online",
  offline: "Offline",
  error: "Error",
};

export function esphomeLifecycleLabel(state: string | null | undefined): string | null {
  if (!state) return null;
  return LIFECYCLE_LABELS[state] ?? state.replace(/_/g, " ");
}
