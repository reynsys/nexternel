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
