# Nexternel V3 — Phase 7 History & Charts

| Field | Value |
|-------|--------|
| **Phase** | Migration Plan engineering Phase 7 (History Service & Charts) |
| **Version** | V3.1.020 |

## Features

- `GET /api/v1/history?capabilityId=&range=` — Flux queries against existing InfluxDB
- Ranges: `1h`, `6h`, `24h` (default), `7d` only; aggregate `1m` or `5m`
- Dashboard widget type **history** (ECharts line), bound to a capability
- Node-RED remains the **only** writer to Influx (`sensor_reading`)

## Influx conventions (unchanged)

| Item | Value |
|------|--------|
| Measurement | `sensor_reading` |
| Tags | `device` (device slug / MQTT device segment), `entity_id`, `entity_type` |
| Field | `value` |
| Writer | Node-RED HTTP write to Influx |

Capability → tags: `capabilities` JOIN `devices.slug` + `sensors`/`relays` (`COALESCE(esphome_entity_id, slug)`).

## Deploy

Upload `apps/api/`, `apps/ui/`, `docker-compose.yml`. Confirm Influx env on the server (PuTTY):

```bash
cd ~/damn-home
grep -E '^INFLUXDB_(URL|TOKEN|ORG|BUCKET)=' .env
docker compose exec web printenv | grep -E '^INFLUXDB_(URL|ORG|BUCKET)='
```

Do **not** paste `INFLUXDB_TOKEN` into chat. Full checklist: [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) → “Confirm INFLUXDB_*”.

```bash
cd ~/damn-home && docker compose build --no-cache api ui && docker compose up -d api ui
```

Then:

```bash
docker compose exec api printenv | grep -E '^INFLUXDB_(URL|ORG|BUCKET)='
```

Hard-refresh the browser. Edit dashboard → Add widget → **History chart**.
