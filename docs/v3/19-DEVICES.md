# Nexternel V3 — Devices

| Field | Value |
|-------|--------|
| **Version** | V3.1.045+ |
| **UI** | [`apps/ui/src/pages/admin/DevicesPage.tsx`](../../apps/ui/src/pages/admin/DevicesPage.tsx) |
| **API** | [`apps/api/src/routes/devices.ts`](../../apps/api/src/routes/devices.ts) |

## Purpose

Register ESPHome / MQTT devices so dashboards and Live can bind capabilities. Firmware is flashed in **ESPHome Builder** (`:6052`); this page owns the database registration.

## Main actions (admin)

| Action | Notes |
|--------|--------|
| Add / Register | Manual or import from `esphome/*.yaml` |
| Edit | Name, area, MQTT prefix, ESPHome name, IP |
| Enable / disable | Soft flag on the device |
| Delete | Cascades sensors/relays (capabilities rebuild on sync) |
| Sync from YAML | Upsert sensors/relays from matching ESPHome file |
| Sync capabilities | Rebuild `capabilities` + MQTT bindings from sensors/relays |
| Rename sensor/relay | Updates entity + capability display name |

## API

| Method | Path |
|--------|------|
| GET | `/api/v1/devices` |
| POST | `/api/v1/devices` |
| PATCH | `/api/v1/devices/:id` |
| DELETE | `/api/v1/devices/:id` |
| GET | `/api/v1/devices/esphome-catalog` |
| GET | `/api/v1/devices/esphome-suggest?name=` |
| POST | `/api/v1/devices/:id/sync-esphome` |
| PATCH | `/api/v1/devices/:deviceId/relays/:relayId` |
| PATCH | `/api/v1/devices/:deviceId/sensors/:sensorId` |

The API container mounts `./esphome:/esphome:ro` so YAML import works in Docker.

Postgres tables `devices`, `sensors`, and `relays` remain the entity store; `capabilities` is derived via sync.
