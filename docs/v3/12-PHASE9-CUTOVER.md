# Nexternel V3 — Phase 9 Cutover (parallel run)

> **Superseded by Phase 10.** V2 Next.js is retired. See [13-PHASE10-RETIRE-NEXT.md](13-PHASE10-RETIRE-NEXT.md). This document remains for historical soak/cutover notes.

| Field | Value |
|-------|--------|
| **Phase** | Migration Plan engineering Phase 9 |
| **Version** | V3.1.024 |
| **Default UI** | `http://SERVER_IP:8080` |
| **Legacy UI** | ~~`http://SERVER_IP:3000`~~ — removed in Phase 10 |
| **API** | `http://SERVER_IP:4000` |

V3 became the **default operator UI** in Phase 9. V2 Next.js stayed running for rollback during soak; **Phase 10** removed it.

---

## Ports

| Port | Service | Role now |
|------|---------|----------|
| **8080** | `ui` | **Default** dashboard / admin SPA |
| **4000** | `api` | V3 Backend API |
| **3000** | `web` | **Legacy** V2 UI (safety net) |
| 1880 | Node-RED | Automations |
| 1883 | Mosquitto | MQTT |
| 8086 | InfluxDB | History |
| 5432 | PostgreSQL | Config |

Bookmark **`:8080`**. Use nav **Legacy UI** (or `:3000`) only if needed.

---

## Pre-cutover checklist

Complete on V3 (`:8080`) before treating it as primary:

- [ ] Login with same credentials as V2; session refresh works after ~15 minutes
- [ ] Create/open a dashboard; add widget; Save; reload layout persists
- [ ] Live switch toggle updates state
- [ ] History chart shows points for a known sensor
- [ ] System page loads; **Open Node-RED** reaches `:1880`
- [ ] Rooms / Devices lists match V2 data
- [ ] Admin can open Users; viewer cannot create users / sync capabilities
- [ ] Troubleshoot → Copy report works
- [ ] `SERVER_IP` and `INFLUXDB_*` present for `api` (see TROUBLESHOOTING.md)

---

## Go-live

1. Confirm stack is up: `cd ~/damn-home && docker compose ps`
2. Open `http://YOUR_SERVER_IP:8080` and sign in
3. Replace daily bookmarks from `:3000` → `:8080`
4. Leave `web` (V2) running — do **not** `docker compose stop web` yet
5. Prefer V3 for daily tasks for **1–2 weeks** (soak)

---

## Rollback

If V3 blocks daily work:

1. Open **Legacy UI** from the V3 nav, or go to `http://YOUR_SERVER_IP:3000`
2. Continue on V2 as before
3. Leave V3 `api` / `ui` running (idle is fine) unless you need to free resources
4. Report via Troubleshoot copy on `:8080` when possible

No proxy swap required — ports are independent.

---

## Security checklist (Phase 9)

- [ ] Browser never holds MQTT / Influx / Postgres passwords
- [ ] V3 uses JWT access + refresh only (Bearer / localStorage + optional cookies)
- [ ] User mutations and capability sync require **admin**
- [ ] Secrets live in server `~/damn-home/.env` only (not git)
- [ ] FTP/vsftpd and LAN access remain your edge trust model; TLS at reverse proxy is optional later

---

## E2E smoke (after each V3 deploy)

1. Sign in on `:8080`
2. Dashboards → open one → Edit → add/remove widget → Save
3. Toggle a switch on Live or dashboard
4. Confirm history chart still loads
5. System → Open Node-RED (new tab)
6. Admin: Users list (if admin)
7. Legacy UI link opens `:3000`

---

## Deploy V3 (default path)

**FileZilla:** upload `apps/ui/` and/or `apps/api/` (and `packages/` when plugin-sdk / example-clock change).

**PuTTY:**

```bash
cd ~/damn-home && docker compose build --no-cache api ui && docker compose up -d api ui
```

Hard-refresh (`Ctrl+Shift+R`). Sign out/in if auth/role claims changed.

Legacy V2 rebuild (only when editing `apps/web/`):

```bash
cd ~/damn-home && docker compose stop web && docker compose build --no-cache web && docker compose up -d web
```

---

## Next

After a successful soak → **Phase 10** (retire Next.js / compose without `web`).
