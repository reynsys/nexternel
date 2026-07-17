# Dashboard widgets

What you can place on a Nexternel **Home** dashboard. Add and arrange widgets in **Settings → Edit dashboard**. Browse live previews in **Settings → Widget library**.

**Current software version** is shown in the sidebar footer (also listed at the top of [CHANGELOG.md](../CHANGELOG.md)).

---

## Quick start

1. Open **Settings → Edit dashboard**.
2. Choose a dashboard tab (or create one).
3. **Add widget** → pick a type → bind it to a device, sensor, or relay where required.
4. Resize (grid cells) and place the widget, then **Save**.
5. For platform gauges (temperature, humidity, CO₂, speed, etc.), open **Gauge Studio** from the widget to customise dials.

Widgets sit on a **column × row** grid. A compact switch might be **1×1**; a large gauge or relay panel can span **2×2** or more.

---

## Sensors & gauges

Use these for live numeric readings from ESP32 sensors (or any MQTT-backed sensor registered under **Devices**).

| Widget | Typical use | Notes |
|--------|-------------|--------|
| **Platform gauge** (Gauge Studio) | Temperature, humidity, CO₂, pressure, light, custom scales | Semicircle / grafana / radial dials; bind a sensor; edit colours, zones, and labels in Gauge Studio |
| **Semicircle needle gauge** | Temperature-style dials | Library gauge with coloured zones and needle |
| **Ring gauge** | Humidity 0–100% | Circular progress with centre value |
| **Solid arc gauge** | Fuel-gauge style fill | Thick arc that fills with the reading |
| **Gaussian / icon / progress / radial stat** | Simple live value cards | Large number + optional icon, progress bar, or mini radial |
| **Device sensors panel** | Several sensors from one ESP32 | Compact multi-reading card for one device |
| **Room sensors** | All sensors in an area | Grouped by room / area |

**Examples:** living-room temperature (°C), bathroom humidity (%), CO₂ (ppm), outdoor light, soil moisture — any sensor type you register can drive a gauge or stat card.

---

## Switches & relays

Control ESP32 relays (lights, sockets, pumps, etc.). State syncs across browsers.

| Widget | Typical use | Notes |
|--------|-------------|--------|
| **Device relay panel** | All relays on one ESP32 | Layouts: list, 2-column grid, vertical buttons, horizontal buttons, round power buttons |
| **Pill / compact / round toggle** | Single relay | One switch per widget |
| **Relay status card** | ON/OFF status + toggle | Badge-style status |
| **Vertical / horizontal buttons** | Explicit ON and OFF | Good for tall or wide cells |

**Examples:** garden lights, waterfall, sprinklers, room sockets — bind a device or a single relay.

---

## Charts & history

History comes from **InfluxDB** (Node-RED writes MQTT readings over time).

| Widget | Typical use | Notes |
|--------|-------------|--------|
| **Area history chart** | 24-hour trend with headline value | Bind a sensor with history |
| **Line history chart** | Sparkline over ~24 hours | Compact trend line |

---

## Time, calendar & weather

| Widget | Typical use | Notes |
|--------|-------------|--------|
| **Clock (time)** | Digital / analog clock | Local time on the dashboard |
| **Calendar** | Date / calendar view | Day and month context |
| **Weather** | Outdoor conditions | Forecast-style card (configure location as documented in the app) |

---

## Network & system

| Widget | Typical use | Notes |
|--------|-------------|--------|
| **Internet speed test** | Download speed (Mbps) | Runs on the **server**; shows LAN / WAN addresses; optional Gauge Studio dial |
| **Network status** | Connectivity summary | Network-oriented status card |
| **System info** | Host / stack info | Server-oriented summary |
| **Activity log** | Recent events | Compact log list for the dashboard |
| **Device status** | Device online / offline | Per-device health |

---

## Appearance

Every widget can use the shared **shape / style / border / padding** options (and theme colours from **Settings → Themes**). Platform gauges also support **Gauge Studio** design snapshots (arc colours, needle, tick labels, value label).

---

## Tips

- Prefer **one job per widget** — e.g. one temperature gauge, one relay panel for the garden board.
- Use **dashboard tabs** so Kitchen, Garden, and Overview stay uncluttered.
- Bind gauges to the correct **sensor**; bind switches to the correct **relay** or **device**.
- After changing the web UI on the server, hard-refresh the browser (Ctrl+Shift+R) so you see the new version in the sidebar.

---

## Related

- [CHANGELOG.md](../CHANGELOG.md) — version history (newest first)
- [README.md](../README.md) — install overview and stack description
- In the app: **Settings → Widget library** for interactive previews
