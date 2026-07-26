# Nexternel V3 — General dashboard widgets

| Field | Value |
|-------|--------|
| **Version** | V3.1.050 |
| **Code** | [`apps/ui/src/widgets/general/`](../../apps/ui/src/widgets/general/) |
| **Edit** | [`GeneralWidgetEditor.tsx`](../../apps/ui/src/widgets/GeneralWidgetEditor.tsx) |
| **Weather API** | `GET /api/v1/weather?lat=&lon=` ([`apps/api/src/routes/weather.ts`](../../apps/api/src/routes/weather.ts)) |

## Purpose

**General** widgets are dashboard chrome: time, place, host health, fleet health. They do **not** require a capability binding (unlike Stat / Switch / ECharts).

Catalog category: **System** (alongside Clock plugin and blank ECharts).

Clock remains the example **plugin** (`plugin.clock`). Calendar, Weather, System information, and Device status are **first-party core** widgets under `widgets/general/`.

## Shipped types (V3.1.049)

| Type id | UI | Data | Edit fields | Poll |
|---------|-----|------|-------------|------|
| `calendar` | Month grid, Mon-first, today highlight | Client `Date` | Optional title | 1 min (re-render) |
| `weather` | Temp / humidity / wind + 5-day strip | `GET /api/v1/weather` → Open-Meteo | Title, location label, lat, lon | ~15 min |
| `system_info` | Version, uptime, CPU%, RAM%, temperature | `GET /api/v1/system` | Optional title | ~30 s |
| `device_status` | Online / offline / disabled counts + list | `GET /api/v1/devices` | Title; offline-only toggle | ~30 s |

Default grid sizes: calendar / weather / device_status **4×4**; system_info **4×3**.

## Architecture

- **Add dialog** → `widget-catalog.ts` (`needsCapability: false`) → `DashboardPage.addWidget`
- **Render** → `WidgetRenderer` → `GeneralWidgetBody` (no Stat-style outer header)
- **Edit** → `SectionGrid` → `GeneralWidgetEditor`

Weather is always fetched via the **API proxy** (auth cookie), not browser-direct to Open-Meteo.

## Roadmap (not in this release)

High fit for MQTT / ESPHome / local-first:

| Idea | Notes |
|------|--------|
| Network status | LAN/WAN IP, MQTT broker (extend `api.system()`) |
| Activity / event feed | Recent relay commands & online flips (needs activity log API) |
| Area overview | Per-area sensors + switch online count |
| MQTT topic health | Last-seen / silent &gt; N min warnings |
| Sunrise / sunset | Complements weather; Open-Meteo or suncalc |
| Image / camera snapshot | Media category; URL or ESPHome still |
| Floorplan / image map | Hotspots bound to switches |
| Countdown / timer | Kitchen / irrigation + MQTT action |
| Notification / alert banner | Threshold breaches from capabilities |
| Node-RED deep link card | Jump to flows with status chip |

Lower priority: internet speed test, full calendar sync (Google/CalDAV), music players — only if they stay local-first.

## Related

- Widget catalog: [16-WIDGET-CATALOG.md](16-WIDGET-CATALOG.md)
- ECharts: [17-ECHARTS-WIDGETS.md](17-ECHARTS-WIDGETS.md)
- Devices admin: [19-DEVICES.md](19-DEVICES.md)
