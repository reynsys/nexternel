# Nexternel V3 — Widget catalog categories

> **Deprecation (V4):** The widget catalogue is **retired for new work**. Nexternel V4 architecture is **frozen**. Add dashboard surfaces via the [View Registry](09-VIEW-REGISTRY.md) (System → Area → Appearance), not new widget types. Legacy widgets remain read-only until migrated. See [18-DASHBOARD-UX-ARCHITECTURE.md](18-DASHBOARD-UX-ARCHITECTURE.md) and [V4-IMPLEMENTATION.md](V4-IMPLEMENTATION.md).

| Field | Value |
|-------|--------|
| **Version** | V3.1.049+ |
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
| System | Clock, calendar, weather, host & device status (+ blank ECharts) |
| Media | — (reserved) |
| Plugins | Uncategorized plugin contributions |

ECharts details: [17-ECHARTS-WIDGETS.md](17-ECHARTS-WIDGETS.md).

**Tip:** Line / area / bar charts are under **Charts (history)**, not Sensors.
