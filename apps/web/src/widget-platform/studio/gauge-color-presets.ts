export const GAUGE_COLOR_PRESETS = [
  { label: "Traffic", colors: ["#5BE12C", "#F5CD19", "#EA4228"] },
  { label: "Ocean", colors: ["#00bcd4", "#2196f3", "#3f51b5"] },
  { label: "Sunset", colors: ["#ff9800", "#ff5722", "#e91e63"] },
  { label: "Forest", colors: ["#8bc34a", "#4caf50", "#2e7d32"] },
] as const;

export const TICK_INTERVALS = [
  { label: "None", interval: 0 },
  { label: "5", interval: 5 },
  { label: "10", interval: 10 },
  { label: "25", interval: 25 },
  { label: "100", interval: 100 },
] as const;
