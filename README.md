# Nexternel

**Author:** [Rey Osman](https://github.com/reynsys)

**Current release:** see [CHANGELOG.md](CHANGELOG.md). **Dashboard:** port **8080** (V3). **API:** port **4000**.

<p align="center">
  <a href="docs/images/dashboard-home.png"><img src="docs/images/dashboard-home.png" width="280" alt="Home dashboard" /></a>
  <a href="docs/images/edit-dashboard.png"><img src="docs/images/edit-dashboard.png" width="280" alt="Edit dashboard" /></a>
  <a href="docs/images/gauge-studio.png"><img src="docs/images/gauge-studio.png" width="280" alt="Gauge Studio" /></a>
</p>

---

## About this project

**Nexternel** is a self-hosted home-automation stack that runs on **your own Linux server** (typically Ubuntu on your LAN). You operate it locally on your network — the core stack does not depend on a cloud service.

### How it works

ESP32 devices publish sensor and relay state over **MQTT** (via **Mosquitto**). The **V3** React dashboard (`:8080`) and **Fastify API** (`:4000`) are the operator surface. **Node-RED** writes history to **InfluxDB** and runs automations. **PostgreSQL** stores users, devices, rooms, and dashboard layouts. V2 Next.js was retired in Phase 10.

```
ESP32 ──MQTT──► Mosquitto ──► Node-RED ──► InfluxDB
                    │                        ▲
                    └──────► V3 API ─────────┘
                                 ▲
                            V3 UI (:8080)
                                 │
                            PostgreSQL
```

### What’s in the repository

Top-level directories and files in this repo:

- **`apps/ui/`** — React SPA (dashboard/admin on port 8080).
- **`apps/api/`** — Fastify Backend API (port 4000).
- **`packages/`** — shared domain / plugin-sdk / example plugins.
- **`db/`** — PostgreSQL schema (`init.sql`) and SQL migrations. Used by Compose as `./db/init.sql`. **Not InfluxDB.**
- **`docker-compose.yml`** — Starts Mosquitto, PostgreSQL, InfluxDB, Node-RED, api, ui, and ESPHome.
- **`esphome/`** — Example ESP32 device YAML (secrets stay local; see `esphome/secrets.yaml.example`).
- **`mosquitto/config/`** — MQTT broker config (listener, auth). The password file is generated on the server and is gitignored.
- **`nodered/`** — Node-RED settings and example flows (MQTT → InfluxDB style). Runtime flow data lives in a Docker volume.
- **`docs/v3/`** — Generation 3 architecture + phase notes (retire: [13-PHASE10-RETIRE-NEXT.md](docs/v3/13-PHASE10-RETIRE-NEXT.md)).
- **`scripts/`** — Helper scripts for server setup, MQTT password, Node-RED token, GitHub export, and more.

**Compose services without a source directory:** **InfluxDB** is a Docker image plus volume (`influxdb` service in `docker-compose.yml`); sensor history is stored in that volume, not under a repo directory named `InfluxDB`.

**Git hygiene (not product features):** `.gitattributes` forces LF line endings on shell and Docker files so Windows clones do not break Linux scripts. `.gitignore` keeps secrets, `node_modules`, `Template/`, and other local-only paths out of git.

### Services and ports

| Service | Port | Open in browser |
|---------|------|-----------------|
| Dashboard (UI) | 8080 | `http://YOUR_SERVER_IP:8080` |
| API | 4000 | `http://YOUR_SERVER_IP:4000/api/v1/health` |
| ESPHome | 6052 | `http://YOUR_SERVER_IP:6052` |
| Node-RED | 1880 | `http://YOUR_SERVER_IP:1880` |
| InfluxDB | 8086 | `http://YOUR_SERVER_IP:8086` |
| Mosquitto (MQTT) | 1883 | Devices connect here |

Everything except Docker itself runs in containers from `docker-compose.yml` — you do not `apt install` Mosquitto, Postgres, InfluxDB, Node-RED, or ESPHome separately.

---

## Installation

You need an **Ubuntu** server on your LAN (SSH enabled), about **2 GB RAM**, and a PC to upload files. On Windows, use **PuTTY** for SSH commands and **FileZilla** to copy files (SFTP port 22).

Replace `YOUR_SERVER_IP` with your server’s LAN IP, and `~/nexternel` with your project path on the server.

| Step | Action |
|------|--------|
| 1 | Install Docker |
| 2 | Copy the project onto the server |
| 3 | Fix line endings (after Windows upload) |
| 4 | Create `.env` |
| 5 | Create Mosquitto password file |
| 6 | `docker compose up` |
| 7–9 | Admin user, Node-RED, open dashboard |
| 10 | ESP32 devices (optional) |

### Step 1 — Install Docker (PuTTY)

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg lsb-release
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out of SSH and reconnect, then check:

```bash
docker --version
docker compose version
```

### Step 2 — Copy the project to the server

**Git clone** (if the server has internet):

```bash
cd ~
git clone https://github.com/reynsys/nexternel.git
cd nexternel
```

**Or FileZilla:** upload the whole repo into `~/nexternel/` on the server (`apps`, `db`, `docker-compose.yml`, `esphome`, `scripts`, etc.).

### Step 3 — Fix Windows line endings

After any upload from Windows, run this in PuTTY (skips broken `^M` / `bad interpreter` errors):

```bash
cd ~/nexternel
find . -type f \( -name '*.sh' -o -name '.env' \) -exec sed -i 's/\r$//' {} +
chmod +x scripts/*.sh
```

Skip this if you only used `git clone` on Linux.

### Step 4 — Create `.env`

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
| `DATABASE_URL` | Same password as above |
| `INFLUXDB_PASSWORD` / `INFLUXDB_TOKEN` | InfluxDB credentials (save the token) |
| `MQTT_PASSWORD` | MQTT password (same value in ESP32 config later) |
| `NEXTAUTH_SECRET` | Random string (also used as API JWT secret) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin (created by API on startup) |

Generate secrets: `openssl rand -hex 16`  
Save in nano: `Ctrl+O`, Enter, `Ctrl+X`.  
Do **not** commit `.env` or upload it to GitHub.

### Step 5 — Mosquitto password file

```bash
cd ~/nexternel
./scripts/generate-mqtt-passwd.sh
```

### Step 6 — Start the stack

```bash
cd ~/nexternel
docker compose up -d --build
docker compose ps
```

First run can take several minutes. All containers should show **Up**. If Mosquitto exits, Step 5 was probably skipped (`docker compose logs mosquitto`).

### Step 7 — Admin user

The API creates the first admin on startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` (skipped if that username already exists). No separate seed command.

### Step 8 — Node-RED

```bash
./scripts/configure-nodered-token.sh
```

1. Open `http://YOUR_SERVER_IP:1880`
2. Menu → **Import** → `nodered/flows.json`
3. Edit MQTT broker nodes: username/password from `.env` (default user `nexternel`)
4. **Deploy**

### Step 9 — Dashboard

Open `http://YOUR_SERVER_IP:8080` and log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (default user `admin`).

Phase 10 notes: [docs/v3/13-PHASE10-RETIRE-NEXT.md](docs/v3/13-PHASE10-RETIRE-NEXT.md).

### Step 10 — ESP32 (optional)

1. Copy secrets: `cp esphome/secrets.yaml.example esphome/secrets.yaml` and edit Wi‑Fi + MQTT (`YOUR_SERVER_IP`, same `MQTT_PASSWORD` as `.env`).
2. Open ESPHome at `http://YOUR_SERVER_IP:6052`, adapt an example from `esphome/`, flash the device.
3. In the dashboard: **Devices → Add device** with the same MQTT topic prefix as the YAML.

Examples included:

| File | Hardware |
|------|----------|
| `living-room.yaml` | DHT11 + 1 relay — topics under `nexternel/living-room` |
| `garden-relays.yaml` | 4-relay board — topics under `nexternel/garden-relays` |

---

## Using the dashboard

- **Home** — live widget grid (sensors, relays, gauges, clock, weather, and more). Multiple tabs for different layouts.
- **Settings** — Edit dashboard, Widget library, Devices, Areas, Automations, Themes.

Widgets sit on a column × row grid. Resize them in grid cells under **Edit dashboard**. Full list: [docs/DASHBOARD-WIDGETS.md](docs/DASHBOARD-WIDGETS.md).

Release history: [CHANGELOG.md](CHANGELOG.md).

---

## Updating the dashboard after code changes

Upload `apps/ui/` and/or `apps/api/` with FileZilla, then in PuTTY:

```bash
cd ~/nexternel
docker compose build --no-cache api ui
docker compose up -d api ui
```

Full matrix: [DEPLOY.md](DEPLOY.md).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Scripts fail with `^M` / `command not found` | Step 3 (line endings) |
| Mosquitto won’t start | `./scripts/generate-mqtt-passwd.sh` |
| Login fails / no admin | Confirm `ADMIN_*` in `.env`, then `docker compose restart api` |
| No sensor data | `./scripts/mqtt-subscribe.sh`; confirm Node-RED is deployed |
| ESP32 won’t connect | Broker IP = `YOUR_SERVER_IP`; MQTT password matches `.env` |

Useful scripts: `generate-mqtt-passwd.sh`, `configure-nodered-token.sh`, `mqtt-subscribe.sh` (all under `scripts/`). More: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## License

**GNU GPL v3** — see [LICENSE](LICENSE). Copyright © 2026 **Rey Osman**.

Gauge widgets use [react-gauge-component](https://github.com/antoniolago/react-gauge-component) (MIT, © antoniolago).
