# Nexternel V3 — Widget catalog categories

| Field | Value |
|-------|--------|
| **Version** | V3.1.043+ |
| **Code** | [`apps/ui/src/library/widget-catalog.ts`](../../apps/ui/src/library/widget-catalog.ts) |

## Purpose

Add widget picker is organized by **category**, then by **ECharts family** inside the Type menu.

## Current mapping

| Category | What you get |
|----------|----------------|
| Status | Auto, Stat |
| Sensors | Gauges, pie, doughnut, rose, radar, funnel (live) |
| **Charts (history)** | Line, smooth, step, area, bar, scatter, heatmap (from Influx history) |
| Controls | Switch |
| System | ECharts blank + Clock (plugin) |
| Media | — (reserved) |
| Plugins | Uncategorized plugin contributions |

ECharts details: [17-ECHARTS-WIDGETS.md](17-ECHARTS-WIDGETS.md).

**Tip:** Line / area / bar charts are under **Charts (history)**, not Sensors.
