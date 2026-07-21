# Nexternel V3 — Phase 3/4 Capabilities + Telemetry

| Field | Value |
|-------|--------|
| **Phase** | Master Phase 3 (Telemetry) + Phase 4 (Capabilities) |
| **Version** | V3.1.012 |
| **Date** | 2026-07-21 |

## What this adds

- Postgres tables `capabilities` + `capability_bindings` (auto-created on API start)
- Sync from V2 `sensors` / `relays` into capabilities
- MQTT subscribe (device prefixes) → live state cache
- WebSocket `ws://SERVER:4000/api/v1/ws?access_token=...`
- REST `GET /api/v1/capabilities`, `POST /api/v1/capabilities/:id/command`
- UI: live capability list + switch toggles

## Deploy notes

Upload `apps/api/`, `apps/ui/`, `docker-compose.yml`, and optionally `db/migrations/004_capabilities.sql` (API also ensures schema itself).

Rebuild **api** and **ui**. API needs MQTT env (same as V2 web).
