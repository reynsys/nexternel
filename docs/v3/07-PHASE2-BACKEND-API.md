# Nexternel V3 — Phase 2 Backend API

| Field | Value |
|-------|--------|
| **Phase** | Master Phase 2 — Backend API |
| **Version** | V3.1.002 |
| **Date** | 2026-07-21 |

## What this phase adds

- Login / logout / refresh / me (JWT access + refresh cookies)
- Uses the **same Postgres `users` table** as V2 (same username/password)
- List **rooms** and **devices** (read-only)
- Health check reports database status
- UI: Login page + home lists rooms/devices after sign-in

## What this phase does **not** add

- Dashboards, widgets, MQTT, telemetry, capability migration, user admin CRUD

## Cookies

- `nexternel_access` / `nexternel_refresh` (separate from V2 `damnhome_session`)
- V2 login on port 3000 is unaffected

## Roles

V2 has no role column yet — every signed-in user is treated as **admin** for now.
