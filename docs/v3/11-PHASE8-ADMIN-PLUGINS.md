# Nexternel V3 — Phase 8 Admin, System, Node-RED, Plugin Example

| Field | Value |
|-------|--------|
| **Phase** | Migration Plan engineering Phase 8 |
| **Version** | V3.1.022 |

## Features

- **System** page: API version, uptime, CPU/memory, LAN/WAN, MQTT/DB, **Open Node-RED**
- **Users** (admin): list, create, role (admin/viewer), activate/deactivate
- **Rooms** / **Devices** read lists; Devices → Sync capabilities (admin)
- Example plugin **Clock** (`plugin.clock`) via registry — no WidgetRenderer hardcode
- `users.role` column ensured on API startup

## Deploy

Upload `apps/api/`, `apps/ui/`, `packages/plugin-sdk/`, `packages/plugin-example-clock/`, `docker-compose.yml`.

```bash
cd ~/damn-home && docker compose build --no-cache api ui && docker compose up -d api ui
```

Sign out and sign in again so the JWT includes `role` from the database.
