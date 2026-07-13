# Nexternel

Self-hosted smart home stack: ESP32 devices publish sensor and relay data over **MQTT**; a **Next.js** dashboard shows live readings, charts, and a customizable widget grid; **Node-RED** stores history in **InfluxDB** and runs automations.

**Author:** [Rey Osman](https://github.com/reynsys)

---

## About this project

**Nexternel** is a complete home-automation stack you run on **your own hardware** (typically an Ubuntu server on your LAN). Nothing depends on a cloud account for core operation — sensor readings, relay control, dashboard layouts, and history stay on your network.

The repo ships:

- A **Docker Compose** file that installs and runs every server component in one step
- A **Next.js dashboard** with a drag-and-drop widget grid, device admin, and charts
- **Example ESP32 configurations** (see below) based on real setups — copy and adapt them for your wiring

Typical workflow: flash an ESP32 with ESPHome → it publishes to **MQTT** → the dashboard shows live values → **Node-RED** writes history to **InfluxDB** for charts.

---

## Why these technologies

| Technology | Role | Why we use it |
|------------|------|----------------|
| **[ESPHome](https://esphome.io/)** | Firmware for ESP32 boards | Open source, YAML-based, large library of sensors and relays, over-the-air updates, no custom C++ required. One config file per device. |
| **[MQTT](https://mqtt.org/)** + **[Mosquitto](https://mosquitto.org/)** | Message bus between devices and server | Lightweight publish/subscribe protocol — ideal for many small devices sending occasional readings. Mosquitto is a proven open-source broker. |
| **[Node-RED](https://nodered.org/)** | Automation and data pipeline | Visual flow editor; subscribes to MQTT and forwards readings to InfluxDB without writing backend code. Easy to extend later (alerts, schedules). |
| **[InfluxDB](https://www.influxdata.com/)** | Time-series database | Built for sensor history — efficient storage and queries for charts (temperature over time, etc.). |
| **[PostgreSQL](https://www.postgresql.org/)** | Relational database | Stores users, devices, rooms, and dashboard layouts — structured config that fits SQL. |
| **[Next.js](https://nextjs.org/)** | Web dashboard and API | Modern React framework; single app for live UI, admin pages, and REST APIs. |
| **[Docker](https://www.docker.com/)** | Packaging and deployment | One command installs Mosquitto, databases, Node-RED, ESPHome, and the web app — no separate `apt install` per service. |

All server components are **free and open source**. You only need an Ubuntu machine (or similar) with Docker and, optionally, ESP32 boards for physical I/O.

---
## What you get

| Component | Purpose |
|-----------|---------|
| **Dashboard** (`apps/web`) | Live sensors, relays, rooms, admin UI, widget editor |
| **Mosquitto** | MQTT broker — ESP32 and server talk through this |
| **PostgreSQL** | Users, devices, rooms, dashboard layouts |
| **InfluxDB** | Time-series history for charts |
| **Node-RED** | Subscribes to MQTT, writes readings to InfluxDB |
| **ESPHome** | Edit device YAML, compile and flash ESP32 firmware |

You do **not** install Mosquitto, InfluxDB, Node-RED, PostgreSQL, or ESPHome with `apt` on Ubuntu. The repo contains a **`docker-compose.yml`** recipe. When you run **`docker compose up`** (Step 6), Docker **downloads** the official images and **starts** every service as a container. Cloning or uploading the repo alone does **not** start anything — you need Docker plus that one command.

```
ESP32 (ESPHome) ──MQTT──► Mosquitto ──► Node-RED ──► InfluxDB
                              │                        ▲
                              └──────► Next.js ──────────┘
                                         │
                                    PostgreSQL
```

| Service | Port | URL (replace `YOUR_SERVER_IP`) |
|---------|------|--------------------------------|
| Dashboard (Next.js) | 3000 | `http://YOUR_SERVER_IP:3000` |
| ESPHome | 6052 | `http://YOUR_SERVER_IP:6052` |
| Node-RED | 1880 | `http://YOUR_SERVER_IP:1880` |
| InfluxDB | 8086 | `http://YOUR_SERVER_IP:8086` |
| MQTT (Mosquitto) | 1883 | ESP32 devices connect here |

---

## Included ESP32 examples (`esphome/`)

The repo includes **two ready-to-edit device configs** from real installations. They are starting points — change GPIO pins, names, and credentials to match your hardware.

| File | Device | Hardware | What it does |
|------|--------|----------|--------------|
| **`living-room.yaml`** | Living Room ESP32 | **DHT11** on GPIO4 + **one relay** on GPIO26 | Publishes temperature and humidity every 30s; one switch (“Fan Relay”) for a fan or light. Wi‑Fi and MQTT are set directly in the YAML (`YOUR_WIFI_SSID`, `YOUR_SERVER_IP`, etc.). |
| **`garden-relays.yaml`** | Garden Relays ESP32 | **4-relay module** on GPIO32, GPIO33, GPIO25, GPIO26 | Four independent switches (Relay 1–4) — no sensors. Uses `!secret` in `esphome/secrets.yaml` for Wi‑Fi and MQTT (create that file in Step 10a). Relays are configured **active-low** (`inverted: true`), typical for common relay boards. |

**MQTT topic prefixes** (must match when you add the device in the dashboard):

- `nexternel/living-room` — temperature, humidity, fan relay
- `nexternel/garden-relays` — relay_1 … relay_4

Edit YAML in the ESPHome web UI at `http://YOUR_SERVER_IP:6052`, compile, and flash via USB ([web.esphome.io](https://web.esphome.io/)) or over-the-air after the first flash. See **Step 10** in Installation.

`esphome/secrets.yaml.example` is a template for Wi‑Fi and MQTT passwords — copy to `secrets.yaml` on your server only; it is not committed to Git.

---
## Requirements

### Linux server

- **Ubuntu 22.04 or 24.04 LTS** (clean install or existing home server)
- **Docker** and **Docker Compose** (installed in Step 1 below)
- **2 GB RAM** minimum, **10 GB** free disk (more if you keep long InfluxDB history)
- Server on your LAN with a fixed or stable IP (`YOUR_SERVER_IP`)
- **SSH** enabled (default on Ubuntu Server)

### Software stack (installed by Docker in Step 6 — not by `apt`)

The repo includes `docker-compose.yml`. You do **not** run `apt install mosquitto` (or similar) for these. **Step 6** (`docker compose up -d --build`) pulls images from the internet and starts:

| Service | Docker image (automatic) | What it does |
|---------|--------------------------|--------------|
| **Mosquitto** | `eclipse-mosquitto` | MQTT broker for ESP32 and the server |
| **InfluxDB** | `influxdb` | Stores sensor history for charts |
| **PostgreSQL** | `postgres` | Users, devices, rooms, dashboard layouts |
| **Node-RED** | `nodered/node-red` | MQTT → InfluxDB automation |
| **Next.js** (`web`) | Built from `apps/web/Dockerfile` | Dashboard and admin UI |
| **ESPHome** | `ghcr.io/esphome/esphome` | Web UI to edit device YAML and build firmware |

After Step 6, verify with `docker compose ps` — you should see all containers **Up**. Only **Docker** itself is installed manually (Step 1).

### Windows PC (typical workflow)

Most users develop on **Windows** and manage a **Linux server** on the network:

| Tool | Used for |
|------|----------|
| **[PuTTY](https://www.putty.org/)** | SSH terminal on the server — run commands, Docker, `nano` |
| **[FileZilla](https://filezilla-project.org/)** | Upload project files from your PC to the server (FTP or SFTP) |

You can use SSH/SFTP clients on macOS or Linux instead; the steps are the same.

---

## Tools: PuTTY vs FileZilla

| Task | Tool |
|------|------|
| Install Docker, run `docker compose`, edit `.env` on server | **PuTTY** (SSH) |
| Copy this repository from your PC to the server | **FileZilla** (or `git clone` on the server) |
| Re-upload `apps/web/` after code changes | **FileZilla** |
| Run shell scripts, create admin user | **PuTTY** |

**PuTTY** = command line on the server.  
**FileZilla** = drag-and-drop files between your PC and the server.

---

## Installation

Replace `YOUR_SERVER_IP` with your server’s LAN address (e.g. `192.168.1.100`).  
Replace `~/nexternel` with wherever you put the project on the server.

### Overview

| Step | What happens |
|------|----------------|
| 1 | Install **Docker** on Ubuntu (the only manual package install) |
| 2 | Copy project files to the server (FileZilla or `git clone`) |
| 3 | Fix Windows line endings (after FileZilla upload) |
| 4 | Create **`.env`** (passwords for all containers) |
| 5 | Create **Mosquitto password file** (required before broker starts) |
| 6 | **`docker compose up`** — downloads images and starts Mosquitto, InfluxDB, PostgreSQL, Node-RED, dashboard, ESPHome |
| 7–9 | Admin user, Node-RED flow, open dashboard |
| 10 | ESP32 + `secrets.yaml` (optional — skip if you have no devices yet) |

### Step 1 — Install Docker on Ubuntu (PuTTY)

1. Open **PuTTY**, connect to `YOUR_SERVER_IP` port **22**, log in.
2. Run:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg lsb-release
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

3. **Log out of PuTTY and reconnect** (so the `docker` group applies).
4. Verify:

```bash
docker --version
docker compose version
```

### Step 2 — Get the project onto the server

**Option A — Git on the server (if the server has internet):**

```bash
cd ~
git clone https://github.com/reynsys/nexternel.git
cd nexternel
```

**Option B — FileZilla from Windows (common for home servers):**

1. Download or clone this repo on your **PC**.
2. In **FileZilla**, connect to your server (SFTP port **22** or FTP port **21** if you use vsftpd).
3. On the server side, create a folder e.g. `nexternel`.
4. Upload **all** files and folders from the repo into `~/nexternel/` (`apps`, `docker-compose.yml`, `esphome`, `scripts`, etc.).

### Step 3 — Fix Windows line endings (important after FileZilla upload)

Files edited or uploaded from **Windows** often contain hidden `^M` (`\r`) characters. On Linux this breaks shell scripts and `.env` loading. You may see errors like:

- `bad interpreter: /bin/bash^M`
- `: command not found`
- `syntax error: unexpected end of file`

**Run this in PuTTY** from the project folder **after every upload from Windows**:

```bash
cd ~/nexternel
find . -type f \( -name '*.sh' -o -name '.env' \) -exec sed -i 's/\r$//' {} +
chmod +x scripts/*.sh
```

If you use **git clone** directly on Linux, you can usually skip this step.

### Step 4 — Create `.env` (passwords and server IP)

```bash
cd ~/nexternel
cp .env.example .env
nano .env
```

Edit **every** `change_me_*` value. At minimum set:

| Variable | What to put |
|----------|-------------|
| `SERVER_IP` | Your Ubuntu server LAN IP |
| `POSTGRES_PASSWORD` | Random strong password |
| `DATABASE_URL` | Must use the same postgres password |
| `INFLUXDB_PASSWORD` | Random password |
| `INFLUXDB_TOKEN` | Long random string (save it — Node-RED needs it) |
| `MQTT_PASSWORD` | Random password (same value goes in ESP32 config later) |
| `NEXTAUTH_SECRET` | Random string |
| `NEXTAUTH_URL` | `http://YOUR_SERVER_IP:3000` |
| `ADMIN_PASSWORD` | Password for logging into the dashboard |

Generate random strings on the server: `openssl rand -hex 16`

Save in nano: `Ctrl+O`, Enter, `Ctrl+X`.

This file stays on your server only — do not upload it to GitHub or commit it to Git.

### Step 5 — Create Mosquitto password file (PuTTY)

The Mosquitto container starts in Step 6, but it needs a password file on disk first. This script reads `.env` and creates `mosquitto/config/passwd`:

```bash
cd ~/nexternel
./scripts/generate-mqtt-passwd.sh
```

### Step 6 — Install and start the full stack (PuTTY)

This is the step that **installs and runs** Mosquitto, InfluxDB, PostgreSQL, Node-RED, the Next.js dashboard, and ESPHome. Docker downloads images (first time only) and builds the web app. Expect **5–20 minutes** on first run:

```bash
cd ~/nexternel
docker compose up -d --build
```

Watch progress:

```bash
docker compose ps
```

You should see something like:

```
NAME                    STATUS
nexternel-postgres      Up (healthy)
nexternel-influxdb      Up (healthy)
nexternel-mosquitto     Up
nexternel-nodered       Up
nexternel-web           Up
nexternel-esphome       Up
```

If a service is missing or **Exited**, run `docker compose logs SERVICE_NAME` (e.g. `mosquitto`). Mosquitto usually fails if Step 5 was skipped.

**You do not need to install ESPHome, Node-RED, or Mosquitto separately** — they are running inside Docker after this step. Open `http://YOUR_SERVER_IP:6052` to confirm ESPHome; `http://YOUR_SERVER_IP:1880` for Node-RED.

### Step 7 — Create dashboard admin user (PuTTY)

```bash
docker compose exec web node scripts/seed-admin.js
```

You should see: `Admin user 'admin' created successfully.`

### Step 8 — Configure Node-RED (MQTT → InfluxDB)

1. On the server:

```bash
./scripts/configure-nodered-token.sh
```

2. Open `http://YOUR_SERVER_IP:1880` in your browser.
3. Menu → **Import** → select `nodered/flows.json` from the project.
4. Double-click any **MQTT** node → edit broker → set username/password from `.env` (default user `nexternel`).
5. Click **Deploy** (top right).

Sensor data will flow into InfluxDB once ESP32 devices publish to MQTT.

### Step 9 — Open the dashboard

1. Go to `http://YOUR_SERVER_IP:3000`
2. Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (default user: `admin`).

### Step 10 — ESP32 devices (optional — skip if you have no hardware)

ESPHome is **already running** in Docker after Step 6 (`http://YOUR_SERVER_IP:6052`). You only need the steps below when you connect a physical ESP32.

**10a — Create ESPHome secrets** (Wi‑Fi and MQTT for device firmware — not required for the server alone):

```bash
cd ~/nexternel
cp esphome/secrets.yaml.example esphome/secrets.yaml
nano esphome/secrets.yaml
```

Set Wi‑Fi SSID/password, MQTT broker IP (`YOUR_SERVER_IP`), and the same `MQTT_PASSWORD` as in `.env`. Some device YAML files reference `!secret` values in this file; without it, compiling firmware for those devices will fail.

**10b — Configure and flash a device**

1. Open `http://YOUR_SERVER_IP:6052` (ESPHome dashboard in the browser).
2. Pick an example from **`esphome/`** (see [Included ESP32 examples](#included-esp32-examples-esphome)) — `living-room.yaml` (DHT11 + relay) or `garden-relays.yaml` (4 relays). Edit Wi‑Fi, MQTT, and GPIO pins for your wiring.
3. Flash ESP32 via **INSTALL** in ESPHome or [web.esphome.io](https://web.esphome.io/).
4. In the Nexternel dashboard: **Admin → Devices → Add device** — use the same MQTT topic prefix as in the YAML (`nexternel/living-room` or `nexternel/garden-relays`).

---

## Updating after code changes

Upload changed files with **FileZilla** (usually the whole `apps/web/` folder), fix line endings if needed (Step 3), then in **PuTTY**:

```bash
cd ~/nexternel
docker compose stop web
docker compose build --no-cache web
docker compose up -d web
```

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Scripts fail with `^M` or `command not found` | Run Step 3 (line endings) |
| Mosquitto won’t start | Run `./scripts/generate-mqtt-passwd.sh` |
| Dashboard login loops | Check `NEXTAUTH_URL=http://YOUR_SERVER_IP:3000` in `.env`, rebuild web container |
| No sensor data on dashboard | Check MQTT with `./scripts/mqtt-subscribe.sh`; verify Node-RED flow is deployed |
| ESP32 won’t connect | MQTT broker IP must be `YOUR_SERVER_IP`; password must match `.env` |

---

## License

**GNU GPL v3** — see [LICENSE](LICENSE). Copyright © 2026 **Rey Osman**.

Gauge widgets use [react-gauge-component](https://github.com/antoniolago/react-gauge-component) (MIT, © antoniolago).
