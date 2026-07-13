/** X-axis tick for sliding 24h charts — even, readable labels. */
export function formatChartAxisTick(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";

  const hours = d.getHours();
  const minutes = d.getMinutes();
  if (hours === 0 && minutes < 30) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Tooltip heading for a chart point. */
export function formatChartTooltipTime(label: string | number): string {
  const ms = typeof label === "number" ? label : Number(label);
  if (Number.isNaN(ms)) return String(label);
  return new Date(ms).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
