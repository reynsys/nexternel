# Nexternel

Self-hosted smart home: ESP32 (ESPHome) → MQTT → dashboard, history, and automations.

**Author:** [Rey Osman](https://github.com/reynsys)  
**Current release:** see [CHANGELOG.md](CHANGELOG.md) and the `VERSION` file in this repo.

<p align="center">
  <a href="docs/images/dashboard-home.png"><img src="docs/images/dashboard-home.png" width="280" alt="Home dashboard" /></a>
  <a href="docs/images/edit-dashboard.png"><img src="docs/images/edit-dashboard.png" width="280" alt="Edit dashboard" /></a>
  <a href="docs/images/gauge-studio.png"><img src="docs/images/gauge-studio.png" width="280" alt="Gauge Studio" /></a>
</p>

---

## About

**Nexternel** runs on **your own Ubuntu server** on your LAN. You do not install Mosquitto, Postgres, InfluxDB, or Node-RED with `apt` — **Docker Compose** starts them all.

```
ESP32 ──MQTT──► Mosquitto ──► Node-RED ──► InfluxDB
                    │                        ▲
                    └──────► API (:4000) ────┘
                                 ▲
                            UI (:8080)
                                 │
                            PostgreSQL
```

Optional CCTV: cameras publish **RTSP** → **go2rtc** (:1984) → live tiles on the dashboard.

### Services and ports

| Service | Port | Open in browser / use |
|---------|------|------------------------|
| **UI** (dashboard + admin) | **8080** | `http://YOUR_SERVER_IP:8080` |
| **API** | **4000** | `http://YOUR_SERVER_IP:4000/api/v1/health` |
| ESPHome | 6052 | `http://YOUR_SERVER_IP:6052` |
| Node-RED | 1880 | `http://YOUR_SERVER_IP:1880` |
| go2rtc (cameras) | 1984 | `http://YOUR_SERVER_IP:1984` |
| InfluxDB | 8086 | `http://YOUR_SERVER_IP:8086` |
| Mosquitto (MQTT) | 1883 | ESP32 devices connect here |
| PostgreSQL | 5432 | Internal (Docker network) |

### What’s in the repository

| Path | Role |
|------|------|
| `apps/ui/` | React SPA (dashboard) |
| `apps/api/` | Fastify backend API |
| `packages/` | Shared domain / plugins |
| `db/` | PostgreSQL `init.sql` + migrations |
| `docker-compose.yml` | All services |
| `esphome/` | Example device YAML |
| `mosquitto/config/` | MQTT broker config |
| `nodered/` | Example flows |
| `go2rtc/` | Camera restreamer config |
| `scripts/` | MQTT password, Node-RED token, helpers |
| `INSTALL.md` | Longer step-by-step (FileZilla / vsftpd) |

---

## Requirements

- Ubuntu **22.04** or **24.04** LTS, SSH enabled  
- About **2 GB RAM**, **10 GB** free disk  
- Server **LAN IP** (e.g. `192.168.1.100`) — call this `YOUR_SERVER_IP` below  
- ESP32 + sensors optional at first  

On Windows: **PuTTY** (SSH) and optionally **FileZilla** (upload).

---

## Install (summary)

Replace `YOUR_SERVER_IP` everywhere. Folder name `~/nexternel` is an example — any path is fine.

### 1 — Install Docker (PuTTY)

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg lsb-release
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out of SSH and reconnect, then:

```bash
docker --version
docker compose version
```

**Important:** After `usermod -aG docker $USER`, you **must** open a **new** PuTTY session (or run `newgrp docker`). If you skip that, later steps fail with:

`permission denied while trying to connect to the Docker API at unix:///var/run/docker.sock`

### 2 — Get the project on the server

**Option A — git clone** (server has internet):

```bash
cd ~
git clone https://github.com/reynsys/nexternel.git
cd nexternel
```

**Option B — FileZilla:** upload the whole repo into `~/nexternel/` (`apps`, `db`, `docker-compose.yml`, `esphome`, `go2rtc`, `scripts`, etc.).  
Longer FTP/vsftpd walkthrough: [INSTALL.md](INSTALL.md).

### 3 — Fix Windows line endings (after FileZilla upload)

```bash
cd ~/nexternel
find . -type f \( -name '*.sh' -o -name '.env' \) -exec sed -i 's/\r$//' {} +
chmod +x scripts/*.sh
```

Skip if you only used `git clone` on Linux.

### 4 — Create `.env`

```bash
cd ~/nexternel
cp .env.example .env
nano .env
```

Set every `change_me_*` value. At least:

| Variable | Meaning |
|----------|---------|
| `SERVER_IP` | Server LAN IP |
| `POSTGRES_PASSWORD` | Postgres password |
| `DATABASE_URL` | Same password: `postgresql://nexternel:YOUR_PASSWORD@postgres:5432/nexternel` |
| `INFLUXDB_PASSWORD` / `INFLUXDB_TOKEN` | InfluxDB (save the token for Node-RED) |
| `MQTT_PASSWORD` | MQTT password (same on ESP32 later) |
| `NEXTAUTH_SECRET` | Random string (API JWT secret) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin (created by API on startup) |
| `GO2RTC_URL` | Leave `http://go2rtc:1984` (Docker internal) |
| `GO2RTC_PORT` | `1984` (browser play URLs use `SERVER_IP:1984`) |

Generate secrets: `openssl rand -hex 16`  
If a password contains `$`, `#`, spaces, or `!`, wrap it in **double quotes**.  
Save in nano: `Ctrl+O`, Enter, `Ctrl+X`.  
**Never** commit `.env` to GitHub.

### 5 — Mosquitto password file (required)

```bash
cd ~/nexternel
./scripts/generate-mqtt-passwd.sh
```

Without this, Mosquitto will not stay up.

### 6 — Start everything

```bash
cd ~/nexternel
docker compose up -d --build
docker compose ps
```

First run can take several minutes. Expect **Up** for: postgres, influxdb, mosquitto, nodered, api, ui, esphome, **go2rtc**.

Check API:

```bash
curl -s http://127.0.0.1:4000/api/v1/health
```

### 7 — Admin user

No separate seed command. The API creates the first admin from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on startup.

If login fails: confirm those values in `.env`, then `docker compose restart api`.

### 8 — Node-RED

```bash
./scripts/configure-nodered-token.sh
```

1. Open `http://YOUR_SERVER_IP:1880`  
2. Menu → **Import** → `nodered/flows.json`  
3. Edit MQTT broker nodes: username/password from `.env` (default user `nexternel`)  
4. **Deploy**

### 9 — Open the dashboard

`http://YOUR_SERVER_IP:8080` — log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

Side menu includes Dashboards, Live, System, Areas, Devices, **Cameras**, Users, Troubleshoot.

### 10 — ESP32 (optional)

1. `cp esphome/secrets.yaml.example esphome/secrets.yaml` and set Wi‑Fi + MQTT (`YOUR_SERVER_IP`, same `MQTT_PASSWORD`).  
2. Open ESPHome at `http://YOUR_SERVER_IP:6052`, adapt `esphome/*.yaml`, flash.  
3. In the UI: **Devices → Add device** with the same MQTT topic prefix as the YAML.

| Example YAML | Topics (prefix) |
|--------------|-----------------|
| `living-room.yaml` | `nexternel/living-room` |
| `garden-relays.yaml` | `nexternel/garden-relays` |

### 11 — Cameras (optional)

1. Ensure go2rtc is up: `docker compose ps go2rtc`  
2. In the UI: **Cameras → Add camera** with an RTSP URL (prefer a **sub-stream** for dashboard tiles).  
3. Dashboard → add widget → **Media → Camera live stream** → Edit → pick the camera.  

Test RTSP first in VLC (**Media → Open Network Stream**) if the tile stays blank.

---

## Firewall (optional)

If `ufw` is enabled:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp    # UI
sudo ufw allow 4000/tcp    # API (LAN)
sudo ufw allow 6052/tcp    # ESPHome
sudo ufw allow 1880/tcp    # Node-RED
sudo ufw allow 1883/tcp    # MQTT
sudo ufw allow 1984/tcp    # go2rtc (cameras)
sudo ufw allow 8086/tcp    # InfluxDB (optional)
sudo ufw enable
```

---

## Updating after code changes

Upload changed folders (e.g. `apps/ui/`, `apps/api/`), then:

```bash
cd ~/nexternel
docker compose build --no-cache api ui
docker compose up -d api ui
```

If `docker-compose.yml` or `go2rtc/` changed:

```bash
docker compose up -d
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Scripts fail with `^M` / `command not found` | Step 3 (line endings) |
| Mosquitto won’t start | Step 5 — `./scripts/generate-mqtt-passwd.sh` |
| Login fails / no admin | Check `ADMIN_*` in `.env`, then `docker compose restart api` |
| Blank page / API down | `curl -s http://127.0.0.1:4000/api/v1/health` and `docker compose logs api --tail 50` |
| No sensor data | Deploy Node-RED; `./scripts/mqtt-subscribe.sh` |
| Camera add / YAML error | Ensure `go2rtc/go2rtc.yaml` has **no** `streams: {}`; recreate go2rtc |
| ESP32 won’t connect | Broker IP = `YOUR_SERVER_IP`; MQTT password matches `.env` |

Useful: `docker compose ps`, `docker compose logs <service> --tail 80`.

---

## License

**GNU GPL v3** — see [LICENSE](LICENSE). Copyright © 2026 **Rey Osman**.

Gauge widgets use [react-gauge-component](https://github.com/antoniolago/react-gauge-component) (MIT, © antoniolago).
