# Nexternel V3 — Phase 1 Foundation Notes

| Field | Value |
|-------|--------|
| **Phase** | Master Phase 1 — Architecture foundation |
| **Status** | Scaffold created |
| **Date** | 2026-07-21 |

## Created

| Path | Purpose |
|------|---------|
| `package.json` (root) | npm workspaces for `apps/api`, `apps/ui`, `packages/*` only |
| `packages/domain` | Capability + dashboard Zod contract stubs |
| `packages/plugin-sdk` | Plugin manifest / host stubs |
| `apps/api` | Fastify + `GET /api/v1/health` + OpenAPI skeleton |
| `apps/ui` | Vite + React + MUI + React Router shell (dark mode) |
| `plugins/` | Placeholder directory |
| Compose `api` / `ui` | Ports **4000** / **8080** — V2 `web` on **3000** untouched |

## Not in this phase

Auth, devices, MQTT, telemetry, dashboards, widgets, DB migrations, Next retirement.

## Local verify (Windows)

From `D:\ProjectS\DAMN-SmarT-HomE\DAMN HomE`:

```powershell
npm install
npm run build -w @nexternel/domain
npm run build -w @nexternel/plugin-sdk
npm run dev -w @nexternel/api
# other terminal:
npm run dev -w @nexternel/ui
```

- API: http://localhost:4000/api/v1/health  
- UI: http://localhost:5173 (proxies `/api` → 4000)  

## Docker verify (Ubuntu / Compose)

```bash
cd ~/damn-home
docker compose build api ui
docker compose up -d api ui
curl -s http://localhost:4000/api/v1/health
# UI: http://localhost:8080
```

V2 dashboard remains at port 3000.

## Next

Master Phase 2 — Backend API (auth, users, devices) after Phase 1 validation.
