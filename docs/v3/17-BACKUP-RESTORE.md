# Backup & Restore

Full installation recovery via encrypted `.nexbackup` files.

## Where

**Settings → Backup & Restore** (admin only)

For configuration migration between servers (areas, devices, dashboards, ESPHome YAML with broker remap), use **Settings → Configuration** (`.nexcfg`).

## Create backup

1. Set a backup password (minimum 8 characters) — **not stored**; if lost, the backup cannot be decrypted.
2. Optionally include historical sensor data (default: on).
3. **Create Backup** — progress is shown while the API collects configuration, ESPHome, Node-RED, and Influx data.
4. **Download Backup** when ready — e.g. `nexternel-backup-2026-08-08.nexbackup`.

## Restore backup

1. **Select Backup File** and enter the backup password.
2. **Inspect backup** — review date, version, counts, compatibility.
3. Optionally enter Wi‑Fi name/password if ESP32 devices must join a different network on this site.
4. Type `RESTORE` and **Restore Backup**.
5. Nexternel updates MQTT broker credentials, ESPHome YAML, and topic prefixes for **this** server automatically — you do not edit `secrets.yaml` or Mosquitto by hand.
6. Reload the UI when complete. ESP32 devices may need a one-time OTA from the ESPHome dashboard (`:6052`) if they do not reconnect within a few minutes.
7. If Live data does not appear, use **Settings → System → Restart services**.

## Fresh install (no PuTTY for secrets)

On the server, run `scripts/setup-server.sh` once — it creates `.env` with random database, MQTT, and internal service passwords.

Open the Nexternel UI in your browser. On first visit you will see the **setup wizard** to create your administrator account. You do not need to edit `.env` or Mosquitto manually.

## Format

- Outer: magic `NEXBACKUP`, AES-256-GCM + PBKDF2 (100k iterations), per-backup salt.
- Inner (encrypted zip): `manifest.json`, `home/domain.json`, `esphome/`, `automations/nodered/`, `history/influx/` (optional), `operational/` (MQTT).

Restore applies domain data through the V4 schema (not blind PostgreSQL restore).

## API

| Method | Path |
|--------|------|
| POST | `/api/v1/backup/jobs` |
| GET | `/api/v1/backup/jobs/:id` |
| GET | `/api/v1/backup/jobs/:id/download` |
| POST | `/api/v1/backup/inspect` |
| POST | `/api/v1/backup/restore` |

## Deploy

Upload `apps/api/`, `apps/ui/`, `docker-compose.yml`, rebuild API + UI. New Compose volume `backup_jobs` is created automatically.
