# Nexternel V3 — Phase 5/6 Dashboards

| Field | Value |
|-------|--------|
| **Phase** | Master Phase 5 (frontend shell) + Phase 6 (dashboard engine) |
| **Version** | V3.1.013 |

## Features

- App shell with Dashboards / Live nav
- Unlimited dashboards in Postgres (`v3_dashboards`)
- React Grid Layout edit mode (drag/resize)
- Widgets: **stat**, **switch**, **gauge** (ECharts), bound to capabilities
- Live updates via existing WebSocket telemetry

## Deploy

Upload `apps/api/`, `apps/ui/`, optionally `db/migrations/005_v3_dashboards.sql` (API auto-creates table).

```bash
cd ~/damn-home && docker compose build --no-cache api ui && docker compose up -d api ui
```
