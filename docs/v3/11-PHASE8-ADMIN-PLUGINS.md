# Nexternel V3 — Phase 8 Admin, System, Node-RED, Plugin Example

| Field | Value |
|-------|--------|
| **Phase** | Migration Plan engineering Phase 8 |
| **Version** | V3.1.063 |

## Features

- **System** page: **My profile** (display name + picture), Appearance (theme), API host status, network, Node-RED
- **Users** (admin): list with **Role dropdown**, create/edit (display name, role, password, active, avatar, default theme)
- Role changes are **Administrator-only** (Users page is admin-gated; `PATCH /users/:id` requires admin)
- Every signed-in user may update own name/avatar/theme via System (`PATCH /auth/me`)
- **Rooms** / **Devices** read lists; Devices → Sync capabilities (admin)
- Example plugin **Clock** (`plugin.clock`) via registry — no WidgetRenderer hardcode
- `users.role`, `users.theme_prefs`, and `users.avatar_data` columns ensured on API startup

## Deploy

Upload `apps/api/`, `apps/ui/`, `packages/plugin-sdk/`, `packages/plugin-example-clock/`, `docker-compose.yml`, and optionally `db/migrations/` (columns also auto-ensured at API start).

```bash
cd ~/damn-home && docker compose build --no-cache api ui && docker compose up -d api ui
```

Sign out and sign in again so the JWT includes `role` from the database.
