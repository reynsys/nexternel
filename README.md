# Nexternel

Self-hosted smart home stack: ESP32 devices publish sensor and relay data over **MQTT**; a **Next.js** dashboard shows live readings, charts, and a customizable widget grid; **Node-RED** stores history in **InfluxDB** and runs automations.

**Author:** [Rey Osman](https://github.com/reynsys)

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

You do **not** install each of these with `apt` on Ubuntu. **Docker Compose** downloads and runs them as containers from `docker-compose.yml`.

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

## Requirements

### Linux server

- **Ubuntu 22.04 or 24.04 LTS** (clean install or existing home server)
- **Docker** and **Docker Compose** (installed in Step 1 below)
- **2 GB RAM** minimum, **10 GB** free disk (more if you keep long InfluxDB history)
- Server on your LAN with a fixed or stable IP (`YOUR_SERVER_IP`)
- **SSH** enabled (default on Ubuntu Server)

### Software stack (via Docker — included in this repo)

These are defined in `docker-compose.yml` and start together; you do not install them separately:

- **Mosquitto** — MQTT broker
- **InfluxDB 2.x** — sensor history
- **PostgreSQL 16** — configuration database
- **Node-RED** — MQTT → InfluxDB pipeline
- **Next.js web app** — dashboard and API
- **ESPHome** — device configuration and firmware builds

### Windows PC (typical workflow)

Most users develop on **Windows** and manage a **Linux server** on the network:

| Tool | Used for |
|------|----------|
| **[PuTTY](https://www.putty.org/)** | SSH terminal on the server — run commands, Docker, `nano` |
| **[FileZilla](https://filezilla-project.org/)** | Upload project files from your PC to the server (FTP or SFTP) |

You can use SSH/SFTP clients on macOS or Linux instead; the steps are the same.

### Optional hardware

- **ESP32** board, sensors (e.g. DHT11), relay module — needed only when you add physical devices
- USB cable to flash ESP32 from your PC via [web.esphome.io](https://web.esphome.io/)

You can bring up the full server stack and open the dashboard **before** any ESP32 is connected.

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

## Secret files (create on the server — never commit to Git)

GitHub ships **templates only**. Each install needs its own passwords and Wi‑Fi credentials. These files stay **on your server** and are listed in `.gitignore`:

| File | Template / how to create | Contains |
|------|---------------------------|----------|
| **`.env`** | Copy from `.env.example` | Database passwords, MQTT password, admin login, `SERVER_IP`, InfluxDB token |
| **`esphome/secrets.yaml`** | Copy from `esphome/secrets.yaml.example` | Wi‑Fi SSID/password, MQTT broker IP and password |
| **`mosquitto/config/passwd`** | Run `./scripts/generate-mqtt-passwd.sh` | MQTT username/password hash for the broker |

If you commit real `.env` or `secrets.yaml` to a public repo, anyone can see your passwords. Create them only on the server after upload.

---

## Installation

Replace `YOUR_SERVER_IP` with your server’s LAN address (e.g. `192.168.1.100`).  
Replace `~/nexternel` with wherever you put the project on the server.

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

### Step 5 — Create ESPHome secrets (Wi‑Fi and MQTT)

```bash
cp esphome/secrets.yaml.example esphome/secrets.yaml
nano esphome/secrets.yaml
```

Set your Wi‑Fi SSID/password and MQTT broker IP (`YOUR_SERVER_IP`) and the same `MQTT_PASSWORD` as in `.env`.

### Step 6 — Create Mosquitto password file

Mosquitto will not start until this file exists:

```bash
cd ~/nexternel
./scripts/generate-mqtt-passwd.sh
```

### Step 7 — Start all containers

First run downloads images and builds the dashboard (5–20 minutes):

```bash
cd ~/nexternel
docker compose up -d --build
docker compose ps
```

Wait until services show **Up** (postgres and influxdb may show **healthy**).

### Step 8 — Create dashboard admin user

```bash
docker compose exec web node scripts/seed-admin.js
```

You should see: `Admin user 'admin' created successfully.`

### Step 9 — Configure Node-RED (MQTT → InfluxDB)

1. On the server:

```bash
./scripts/configure-nodered-token.sh
```

2. Open `http://YOUR_SERVER_IP:1880` in your browser.
3. Menu → **Import** → select `nodered/flows.json` from the project.
4. Double-click any **MQTT** node → edit broker → set username/password from `.env` (default user `damnhome`).
5. Click **Deploy** (top right).

Sensor data will flow into InfluxDB once ESP32 devices publish to MQTT.

### Step 10 — Open the dashboard

1. Go to `http://YOUR_SERVER_IP:3000`
2. Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (default user: `admin`).

### Step 11 — ESP32 devices (optional)

1. Open `http://YOUR_SERVER_IP:6052` (ESPHome).
2. Edit `living-room.yaml` (or add devices) — Wi‑Fi and MQTT must match `.env` / `secrets.yaml`.
3. Flash ESP32 via **INSTALL** in ESPHome or [web.esphome.io](https://web.esphome.io/).
4. In the dashboard: **Admin → Devices → Add device** — use the same MQTT topic prefix as in the YAML.

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
