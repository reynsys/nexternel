# Nexternel V3 — Phase 10 Retire Next.js

| Field | Value |
|-------|--------|
| **Phase** | Migration Plan engineering Phase 10 |
| **Version** | V3.1.025 |
| **Operator UI** | `http://SERVER_IP:8080` only |
| **API** | `http://SERVER_IP:4000` |
| **V2** | Removed — no `web` service, no `apps/web/` |

Phase 9 parallel soak is complete for this stack. V2 Next.js is **hard-retired**.

Supersedes day-to-day use of [12-PHASE9-CUTOVER.md](12-PHASE9-CUTOVER.md) (kept for history).

---

## Ports (after Phase 10)

| Port | Service | Role |
|------|---------|------|
| **8080** | `ui` | Operator dashboard / admin SPA |
| **4000** | `api` | Backend API |
| 1880 | Node-RED | Automations |
| 1883 | Mosquitto | MQTT |
| 8086 | InfluxDB | History |
| 5432 | PostgreSQL | Config |
| 6052 | ESPHome | Device YAML / flash |

Port **3000** is unused. Bookmark **`:8080`**.

---

## What changed in the tree

- Removed Compose service `web` (`nexternel-web`)
- Deleted `apps/web/`
- Admin bootstrap: API creates first admin from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on startup (idempotent)
- GitHub export version reads `apps/ui/src/version.ts` (`APP_VERSION`)
- Removed Legacy UI nav link and web-only scripts (`rebuild-web.sh`, `pack-web-update.ps1`, `find-web-files.sh`)

---

## Server cutover (Ubuntu / PuTTY)

After uploading the new tree (including `docker-compose.yml`, `apps/api`, `apps/ui`, `scripts` — **no** `apps/web`):

```bash
cd ~/damn-home
docker compose stop web 2>/dev/null || true
docker compose rm -f web 2>/dev/null || true
# Optional: remove leftover folder if still on disk from an old upload
rm -rf apps/web
docker compose up -d --build api ui
docker compose ps
```

Confirm: no `nexternel-web`; `nexternel-api` and `nexternel-ui` are up.

Hard-refresh `http://YOUR_SERVER_IP:8080` (Ctrl+Shift+R).

---

## Fresh install — admin user

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `~/damn-home/.env`. On API start, if that username does not exist, it is created as **admin**. Existing users are never overwritten.

`scripts/setup-server.sh` no longer runs `docker compose exec web …`.

---

## Acceptance smoke

- [ ] Login on `:8080`
- [ ] Dashboards: add widget, Save, reload persists
- [ ] Live switch toggle
- [ ] History chart for a known sensor
- [ ] System / Rooms / Devices / Users (admin)
- [ ] Troubleshoot → Copy report
- [ ] `docker compose ps` has no `web`
- [ ] Browser has no bookmark reliance on `:3000`

---

## Rollback

Restore `apps/web` and the Compose `web` service from GitHub/`nexternel` history (last commit that still contained `apps/web`, historically around **V2.1.207**), redeploy that tree, then:

```bash
cd ~/damn-home
docker compose up -d --build web
```

Prefer fixing V3 instead of rolling back unless daily ops are blocked.

---

## Out of scope (unchanged)

- Reverse proxy / TLS
- Re-implementing V2 ESPHome YAML import in the API
- Deleting legacy Postgres tables (`dashboard_layouts`, etc.)
