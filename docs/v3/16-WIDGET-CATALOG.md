# Nexternel V3 — Widget catalog categories

| Field | Value |
|-------|--------|
| **Version** | V3.1.033+ |
| **Code** | [`apps/ui/src/library/widget-catalog.ts`](../../apps/ui/src/library/widget-catalog.ts) |

## Purpose

Add widget picker is organized by **category** (Status, Sensors, History, Controls, Media, System, Plugins). New panel kinds should prefer config variants under an existing renderer over brand-new unrelated widgets.

## Current mapping

| Category | Types today |
|----------|-------------|
| Status | Auto, Stat |
| Sensors | ECharts presets (gauges, pie, radar, funnel) — catalog keys `echarts.*` |
| History | ECharts presets (line, area, bar, scatter, heatmap, rose) |
| Controls | Switch |
| System | ECharts blank + Clock (plugin) |
| Media | — (reserved) |
| Plugins | Uncategorized plugin contributions |

ECharts details: [17-ECHARTS-WIDGETS.md](17-ECHARTS-WIDGETS.md).

Plugins may set `category` on `WidgetContribution` (SDK). Default is `plugins`.
