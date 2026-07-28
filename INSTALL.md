# Nexternel — Installation Guide

This guide assumes a **clean Ubuntu 22.04 or 24.04 server** with nothing installed except the base OS. You will use **SSH** (PuTTY or terminal) and **FTP** (FileZilla) from your PC.

For day-to-day deploys after setup, see [DEPLOY.md](DEPLOY.md). For problems, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## How the software is installed

You do **not** install Mosquitto, InfluxDB, Node-RED, or PostgreSQL directly on Ubuntu.

Instead:

1. You install **Docker** on Ubuntu (one-time).
2. Docker downloads and runs all services as **containers** from `docker-compose.yml`.

| Service | What it does | Port | Container name |
|---------|--------------|------|----------------|
| **Mosquitto** | MQTT message broker (ESP32 ↔ server) | 1883 | `nexternel-mosquitto` |
| **InfluxDB** | Stores sensor history for graphs | 8086 | `nexternel-influxdb` |
| **PostgreSQL** | Stores devices, rooms, users, cameras | 5432 | `nexternel-postgres` |
| **Node-RED** | Routes MQTT data → InfluxDB + automations | 1880 | `nexternel-nodered` |
| **UI** | Dashboard + admin SPA | 8080 | `nexternel-ui` |
| **API** | Backend API | 4000 | `nexternel-api` |
| **go2rtc** | CCTV RTSP → browser live stream | 1984 | `nexternel-go2rtc` |
| **ESPHome** | Edit YAML, compile & flash ESP32 | 6052 | `nexternel-esphome` |

```
ESP32 (ESPHome) ──MQTT──► Mosquitto ──► Node-RED ──► InfluxDB
                              │                        ▲
                              └──────► API (:4000) ────┘
                                           ▲
                                      UI (:8080)
                                           │
                                      PostgreSQL
CCTV ──RTSP──► go2rtc (:1984) ──► UI camera widgets
```

---

## What you need before starting

### Ubuntu server
- Ubuntu 22.04 or 24.04 LTS installed
- Connected to your home network (Wi‑Fi or Ethernet)
- You know the server **IP address** (e.g. `192.168.1.100`)
- SSH enabled (default on Ubuntu Server)
- At least **2 GB RAM** and **10 GB** free disk

### Windows PC
- **PuTTY** — [https://www.putty.org/](https://www.putty.org/)
- **FileZilla** — [https://filezilla-project.org/](https://filezilla-project.org/)
- This project folder (clone or download from GitHub)

### Hardware (later, for ESP32)
- ESP32 board, DHT11 sensor, relay module, jumper wires
- ESPHome dashboard on the server (`http://SERVER_IP:6052`) — no Python on Windows
- USB data cable to flash from your PC via [web.esphome.io](https://web.esphome.io/)

---

# PART A — Prepare Ubuntu (first login)

## Step A1 — Connect with PuTTY

1. Open **PuTTY**
2. **Host Name:** your server IP (e.g. `192.168.1.100`)
3. **Port:** `22`
4. Click **Open**
5. Log in with your Ubuntu username and password

> First login may ask you to accept the server fingerprint — click **Yes**.

## Step A2 — Update Ubuntu

Run these commands one at a time (or paste the block):

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg lsb-release
```

This updates the system and installs tools needed for Docker.

## Step A3 — Find your server IP (confirm)

```bash
hostname -I
```

Note the first IP address shown (e.g. `192.168.1.100`). You will use this everywhere as `SERVER_IP`.

## Step A4 — (Optional) Allow firewall ports

If Ubuntu firewall (`ufw`) is enabled, open the ports we need:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 21/tcp           # FTP (FileZilla / vsftpd)
sudo ufw allow 40000:40100/tcp  # FTP passive mode
sudo ufw allow 8080/tcp    # Dashboard (UI)
sudo ufw allow 4000/tcp    # API (optional from LAN)
sudo ufw allow 1984/tcp    # go2rtc (CCTV live stream)
sudo ufw allow 6052/tcp    # ESPHome
sudo ufw allow 1880/tcp    # Node-RED
sudo ufw allow 1883/tcp    # MQTT (ESP32)
sudo ufw allow 8086/tcp    # InfluxDB (optional, admin only)
sudo ufw enable
sudo ufw status
```

If `ufw` says it is inactive, you can skip this step.

---

# PART B — Install Docker

Docker runs all Nexternel services. Install it once:

## Step B1 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

## Step B2 — Allow your user to run Docker (no sudo every time)

```bash
sudo usermod -aG docker $USER
```

**Important:** Log out of PuTTY and reconnect (or reboot the server) for this to take effect:

```bash
exit
```

Then open PuTTY again and log back in.

If you continue in the **same** session without logging out, Docker commands fail with:

`permission denied while trying to connect to the Docker API at unix:///var/run/docker.sock`

Quick fix in the current session (then re-run your command):

```bash
newgrp docker
```

## Step B3 — Verify Docker works

```bash
docker --version
docker compose version
docker run hello-world
```

You should see Docker version numbers and a "Hello from Docker!" message.

If `docker compose` is missing:

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
```

---

# PART C — Upload the project (FileZilla + vsftpd)

This project uses **FTP** via **vsftpd** on the Ubuntu server. FileZilla connects on port **21** with your normal Ubuntu username and password.

Install vsftpd **once** on the server (Step C0), then connect FileZilla (Step C1) and upload the project (Step C2).

## Step C0 — Install and configure vsftpd (PuTTY)

Run these commands on the server after PuTTY login. Replace `YOUR_USERNAME` and `YOUR_SERVER_IP` if yours differ.

### Option A — Automated script (after project is on the server)

```bash
cd ~/damn-home
chmod +x scripts/setup-vsftpd.sh
./scripts/setup-vsftpd.sh YOUR_USERNAME YOUR_SERVER_IP
```

### Option B — First-time setup (copy/paste in PuTTY, no project files needed)

Use this when you have not uploaded the project yet:

```bash
sudo apt update
sudo apt install -y vsftpd

sudo cp /etc/vsftpd.conf /etc/vsftpd.conf.bak

sudo tee /etc/vsftpd.conf > /dev/null <<'EOF'
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES
chroot_local_user=YES
allow_writeable_chroot=YES
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=40100
pasv_address=YOUR_SERVER_IP
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist
userlist_deny=NO
seccomp_sandbox=NO
EOF

echo "YOUR_USERNAME" | sudo tee /etc/vsftpd.userlist

sudo mkdir -p /home/YOUR_USERNAME/damn-home
sudo chown YOUR_USERNAME:YOUR_USERNAME /home/YOUR_USERNAME/damn-home

sudo ufw allow 21/tcp
sudo ufw allow 40000:40100/tcp

sudo systemctl enable vsftpd
sudo systemctl restart vsftpd
sudo systemctl status vsftpd
```

You should see `active (running)` at the end.

> **Note:** `pasv_address` must match your server LAN IP (`YOUR_SERVER_IP`). If the IP changes, edit `/etc/vsftpd.conf` and run `sudo systemctl restart vsftpd`.

> **Security:** FTP sends the password in plain text on the network. This is acceptable on a trusted home LAN; do not expose port 21 to the public internet.

## Step C1 — Connect FileZilla (FTP)

1. Open **FileZilla**
2. **File → Site Manager…** (`Ctrl+S`)
3. Click **New Site**, name it e.g. `Nexternel Server`
4. **General** tab:

| Field | Value |
|-------|--------|
| **Protocol** | **FTP — File Transfer Protocol** |
| **Host** | `YOUR_SERVER_IP` |
| **Port** | `21` |
| **Logon Type** | **Normal** |
| **User** | `YOUR_USERNAME` |
| **Password** | your Ubuntu login password |

5. Open the **Transfer Settings** tab:
   - Select **Limit number of simultaneous connections** → **1** (helps avoid flaky home routers)
   - Under encryption, choose **Only use plain FTP (insecure)** if FileZilla asks for TLS/FTPS (we are not using SSL on vsftpd by default)

6. Click **Connect**

After login, the right panel shows your home folder (chrooted), e.g. `/home/YOUR_USERNAME/` — you may see it as `/` in FileZilla. Open or create `damn-home` there.

### Troubleshooting FileZilla / vsftpd

| Error | Cause | Fix |
|-------|--------|-----|
| `Connection refused` on port 21 | vsftpd not running or firewall | On server: `sudo systemctl status vsftpd`; `sudo ufw allow 21/tcp` |
| Login works but directory listing hangs / times out | Passive FTP ports blocked or wrong `pasv_address` | Open ports `40000-40100`; set `pasv_address=YOUR_SERVER_IP` in `/etc/vsftpd.conf`; restart vsftpd |
| `530 Login incorrect` | Wrong user/password or user not in list | Use PuTTY credentials; ensure username is in `/etc/vsftpd.userlist` |
| `500 OOPS` / cannot change directory | Home directory permissions | `sudo chown YOUR_USERNAME:YOUR_USERNAME /home/YOUR_USERNAME`; ensure `allow_writeable_chroot=YES` |
| `Cannot establish FTP connection to an SFTP server` | Protocol set to SFTP | Use **FTP**, not SFTP, in Site Manager |
| TLS/SSL required by client | FileZilla forcing FTPS | Transfer Settings → **Only use plain FTP (insecure)** |

Check vsftpd logs on the server:

```bash
sudo journalctl -u vsftpd -n 30 --no-pager
```

## Step C2 — Upload files

1. **Right panel (server):** go to `/home/YOUR_USERNAME/`
2. Create folder: `damn-home`
3. **Left panel (PC):** open your local project folder
4. Select **all files and folders** inside the project
5. Drag them into `/home/YOUR_USERNAME/damn-home/`

When finished, the server folder should contain:

```
damn-home/
├── apps/
├── db/
├── docker-compose.yml
├── esphome/
├── go2rtc/
├── mosquitto/
├── nodered/
├── scripts/
├── .env.example
├── INSTALL.md
└── README.md
```

## Step C3 — Verify upload (PuTTY)

```bash
cd ~/damn-home
ls -la
```

You must see `docker-compose.yml` in the list.

## Step C4 — Fix Windows line endings (required after FTP upload)

Files uploaded from Windows via FileZilla often contain hidden `\r` characters. Until you fix this, shell scripts and `source .env` will fail with errors like:

- `cd: $'/home/.../scripts\r/..': No such file or directory`
- `: command not found`
- `syntax error: unexpected end of file from 'if' command`

**Run this in PuTTY immediately after upload** (you type it — it does not depend on any project script):

```bash
cd ~/damn-home
find . -type f \( -name '*.sh' -o -name '.env' \) -exec sed -i 's/\r$//' {} +
chmod +x scripts/*.sh
```

Re-run this command any time you re-upload files from Windows.

---

# PART D — Configure passwords and settings

## Step D1 — Create your `.env` file

```bash
cd ~/damn-home
cp .env.example .env
nano .env
```

## Step D2 — Generate random passwords

Open a **second** PuTTY session (keep the first open) and run this **four times** — use a different output for each password/token:

```bash
openssl rand -hex 16
```

Each run prints something like: `a3f8c2e1b9d04f7e6c8a1b2d3e4f5a6`

## Step D3 — Edit every value in `.env`

In `nano`, update **all** `change_me_*` values. Example (use your own values):

| Variable | What to put |
|----------|-------------|
| `SERVER_IP` | Your server IP, e.g. `192.168.1.100` |
| `POSTGRES_PASSWORD` | Random string from openssl |
| `DATABASE_URL` | Must match: `postgresql://nexternel:YOUR_POSTGRES_PASSWORD@postgres:5432/nexternel` |
| `INFLUXDB_PASSWORD` | Random string |
| `INFLUXDB_TOKEN` | Random string (32+ characters) — **save this, needed for Node-RED** |
| `MQTT_PASSWORD` | Random string — **same password goes in ESP32 config later** |
| `NEXTAUTH_SECRET` | Random string (API JWT secret) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin (API creates on startup) |
| `GO2RTC_URL` | Leave `http://go2rtc:1984` (API → go2rtc inside Docker) |
| `GO2RTC_PORT` | `1984` (browser camera streams) |

Also update `TZ` if needed (e.g. `America/New_York`, `Europe/London`).

**Passwords with special characters:** If a value contains `$`, `#`, spaces, or `!`, wrap it in **double quotes** in `.env`:

```
MQTT_PASSWORD="Un1v3r$3"
ADMIN_PASSWORD="my secret pass"
```

Without quotes, bash treats `$3` as a variable and may show `command not found` when loading the file.

**Save and exit nano:** `Ctrl+O`, Enter, `Ctrl+X`

## Step D4 — Verify `.env` loaded correctly

Paste this in PuTTY (does **not** use project shell scripts — safe after FTP upload):

```bash
cd ~/damn-home
sed -i 's/\r$//' .env
set -a && source <(sed 's/\r$//' .env) && set +a
echo "Server IP: $SERVER_IP"
echo "MQTT user: $MQTT_USERNAME"
```

If you skipped Step C4 or see `\r` errors, run the `find ... sed` command from Step C4 first.

You should see your IP and MQTT username (e.g. `nexternel`) — not blank, not `change_me_*`.

---

# PART E — Install all services (Docker Compose)

Follow these steps **in order**. Do not skip Step E2.

## Step E1 — Fix line endings again (if you re-uploaded files)

If you already ran Step C4 after upload, you can skip this unless you uploaded new files from Windows.

```bash
cd ~/damn-home
find . -type f \( -name '*.sh' -o -name '.env' \) -exec sed -i 's/\r$//' {} +
chmod +x scripts/*.sh
```

> If you see `bad interpreter: /bin/bash^M` or `\r` in paths, this step fixes it.

## Step E2 — Create Mosquitto password file (required before start)

Mosquitto **will not start** without this file. The project ships **without** a `passwd` file — you create it here.

If you see `File exists` when running the command below, delete the old placeholder first (from an earlier upload):

```bash
cd ~/damn-home
rm -f mosquitto/config/passwd
```

**Recommended — use the helper script:**

```bash
cd ~/damn-home
./scripts/generate-mqtt-passwd.sh
```

**Or run manually** (loads `.env` without project scripts):

```bash
cd ~/damn-home
sed -i 's/\r$//' .env
set -a && source <(sed 's/\r$//' .env) && set +a
rm -f mosquitto/config/passwd

docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "$(pwd)/mosquitto/config:/mosquitto/config" \
  eclipse-mosquitto:2 \
  mosquitto_passwd -b -c /mosquitto/config/passwd "$MQTT_USERNAME" "$MQTT_PASSWORD"

sudo chown "$(id -u):$(id -g)" mosquitto/config/passwd 2>/dev/null || true
chmod 644 mosquitto/config/passwd
```

Verify (you should be able to read the file without `sudo`):

```bash
ls -la mosquitto/config/passwd
head -1 mosquitto/config/passwd
```

Expected: `-rw-r--r--` owned by your user (e.g. `YOUR_USERNAME`), with a line like `nexternel:$7$...`.

## Step E3 — Download and start all containers

First run downloads images and builds the dashboard — **5 to 20 minutes**:

```bash
cd ~/damn-home
docker compose up -d --build
```

Wait until the command finishes. Watch progress:

```bash
docker compose ps
```

## Step E4 — Wait for services to become healthy

```bash
sleep 20
docker compose ps
```

Expected result — all should show **Up** (postgres and influxdb may show **healthy**):

```
NAME                  STATUS
nexternel-postgres    Up (healthy)
nexternel-influxdb    Up (healthy)
nexternel-mosquitto   Up
nexternel-nodered     Up
nexternel-api         Up
nexternel-ui          Up
nexternel-go2rtc      Up
```

## Step E5 — Create dashboard admin user

The API creates the first admin on startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` (skipped if that username already exists). No separate seed command.

If login fails after a fresh install, confirm those env vars and restart:

```bash
cd ~/damn-home
docker compose restart api
docker compose logs api --tail 30
```

---

# PART F — Verify each service

Run these checks one by one. If any fails, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Step F1 — PostgreSQL

```bash
cd ~/damn-home
docker compose exec postgres psql -U nexternel -d nexternel -c "SELECT name FROM rooms;"
```

Should list: Living Room, Bedroom, Garage.

## Step F2 — InfluxDB

Open in a browser on your PC:

```
http://YOUR_SERVER_IP:8086
```

- Log in with `INFLUXDB_USER` / `INFLUXDB_PASSWORD` from `.env` (default user: `admin`)
- You should see the **sensors** bucket (created automatically)

No further InfluxDB setup is required.

## Step F3 — Mosquitto (MQTT)

```bash
cd ~/damn-home
docker compose ps mosquitto
```

Must show **Up**. Test MQTT subscribe (paste in PuTTY — no script file needed):

```bash
cd ~/damn-home
sed -i 's/\r$//' .env
MQTT_USERNAME=$(grep '^MQTT_USERNAME=' .env | sed 's/\r$//' | cut -d= -f2- | tr -d '"')
MQTT_PASSWORD=$(grep '^MQTT_PASSWORD=' .env | sed 's/\r$//' | cut -d= -f2- | tr -d '"')
docker compose exec mosquitto mosquitto_sub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t 'nexternel/#' -v
```

Or use `./scripts/mqtt-subscribe.sh` after uploading `scripts/` from your PC and running `sed -i 's/\r$//' scripts/*.sh`.

No messages yet is normal (no ESP32 connected). Press `Ctrl+C` to stop.

If you get `Connection refused` or `not authorised`, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Step F4 — Node-RED

Open in browser:

```
http://YOUR_SERVER_IP:1880
```

You should see the Node-RED flow editor (may be empty until you import flows in Part G).

## Step F5 — Dashboard (UI)

Open in browser:

```
http://YOUR_SERVER_IP:8080
```

Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (default username is `admin`).

If you see **Invalid credentials**, confirm `ADMIN_*` in `.env` and that the API started cleanly (`docker compose logs api --tail 50`). Create an admin under **Users** once you can log in with any existing admin, or reset via Postgres (see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)).

You should see the dashboard (empty until devices are added).

---

# PART G — Configure Node-RED

Node-RED connects Mosquitto → InfluxDB and runs example automations.

## Step G1 — Prepare flow file with your InfluxDB token

```bash
cd ~/damn-home
sed -i 's/\r$//' scripts/*.sh
./scripts/configure-nodered-token.sh
```

This replaces `REPLACE_WITH_INFLUXDB_TOKEN` in `nodered/flows.json`.

Or edit manually: open `nodered/flows.json` on your PC, find `REPLACE_WITH_INFLUXDB_TOKEN`, replace with your `INFLUXDB_TOKEN` from `.env`, re-upload via FileZilla.

## Step G2 — Import the flow

1. Open `http://YOUR_SERVER_IP:1880`
2. Click **menu (☰)** top-right → **Import**
3. Click **select a file to import**
4. Choose `flows.json` from `nodered/` folder (on your PC)
5. Click **Import** → **Add to current flow**
6. Click red **Deploy** button top-right

You should see a tab named **DAMN Home - MQTT to InfluxDB** with several nodes.

## Step G3 — Configure Mosquitto credentials in Node-RED

1. Double-click the **All DAMN Home topics** node (or any MQTT node)
2. Click the pencil icon next to **Mosquitto** broker
3. Set:
   - **Server:** `mosquitto`
   - **Port:** `1883`
   - **Username:** value of `MQTT_USERNAME` from `.env` (default: `damnhome`)
   - **Password:** value of `MQTT_PASSWORD` from `.env`
4. Click **Update** → **Done**
5. Click **Deploy** again

## Step G4 — Verify InfluxDB token in flow

1. Double-click the **Build Influx HTTP request** function node
2. Confirm the line reads: `const token = "your-actual-token";` (not `REPLACE_WITH_...`)
3. If wrong, paste your `INFLUXDB_TOKEN` from `.env`
4. Click **Done** → **Deploy**

## Step G5 — Confirm Node-RED is receiving MQTT (after ESP32 is connected)

When ESP32 publishes data, open Node-RED → **Debug** panel (bug icon, right side). With debug nodes enabled, you would see messages. For now, use the MQTT test in Part F3.

---

# PART H — Flash ESP32 (ESPHome on the server)

ESPHome runs in Docker on your Ubuntu server. Use the **web dashboard** to edit config and build firmware — no Python or `pip` on Windows.

## Step H1 — Start ESPHome

```bash
cd ~/damn-home
docker compose up -d esphome
docker compose ps esphome
```

Must show **Up** on port **6052**.

## Step H2 — Open ESPHome (from your Windows browser)

Either:

- **Admin panel:** Dashboard → **Devices** → **Open ESPHome**
- **Direct URL:** `http://YOUR_SERVER_IP:6052` (e.g. `http://YOUR_SERVER_IP:6052`)

You should see the ESPHome dashboard with a **living-room** device (from `esphome/living-room.yaml`).

## Step H3 — Edit WiFi and MQTT

1. Click **living-room** → **EDIT**
2. Set:
   - WiFi `ssid` / `password`
   - MQTT `broker:` your server IP (`YOUR_SERVER_IP`)
   - MQTT `password:` same as `MQTT_PASSWORD` in `.env`
3. Click **SAVE**

## Step H4 — Flash the ESP32

Connect ESP32 to your **Windows PC** with a USB data cable.

1. In ESPHome dashboard, click **INSTALL** on **living-room**
2. Choose **Manual download**
3. Select **Factory format** → wait for compile → browser downloads a `.bin` file
4. Open [https://web.esphome.io/](https://web.esphome.io/) in **Chrome** or **Edge**
5. **Connect** → pick the COM port → **Install downloaded project** → select the `.bin` file
6. Wait for 100%

> **ESP32 plugged into the Ubuntu server instead?** Uncomment the `devices:` section for `esphome` in `docker-compose.yml`, run `docker compose up -d esphome`, then use **INSTALL** → plug into the computer running ESPHome.

## Step H5 — Wiring

| Component | ESP32 pin |
|-----------|-----------|
| DHT11 DATA | GPIO 4 |
| DHT11 VCC | 3.3V |
| DHT11 GND | GND |
| Relay IN | GPIO 26 |
| Relay GND | GND |

## Step H6 — Confirm MQTT

On the server (PuTTY):

```bash
cd ~/damn-home
sed -i 's/\r$//' .env
MQTT_USERNAME=$(grep '^MQTT_USERNAME=' .env | sed 's/\r$//' | cut -d= -f2- | tr -d '"')
MQTT_PASSWORD=$(grep '^MQTT_PASSWORD=' .env | sed 's/\r$//' | cut -d= -f2- | tr -d '"')
docker compose exec mosquitto mosquitto_sub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t 'damnhome/#' -v
```

Or: `./scripts/mqtt-subscribe.sh` (after `sed -i 's/\r$//' scripts/*.sh`)

Within ~30 seconds you should see:

```
damnhome/living-room/sensor/living_room_temperature/state 23.4
damnhome/living-room/sensor/living_room_humidity/state 58
```

Press `Ctrl+C` to stop.

---

# PART I — Register device in dashboard

1. Open `http://YOUR_SERVER_IP:8080`
2. Log in
3. Go to **Devices** → register the device (MQTT topic prefix must match ESPHome)
4. Open **Dashboards** / **Live** — sensors and relays should update

---

# Quick reference — Service URLs

| Service | URL | Login |
|---------|-----|-------|
| **Dashboard** | `http://SERVER_IP:8080` | `.env` ADMIN_* |
| **API** | `http://SERVER_IP:4000/api/v1/health` | — |
| **ESPHome** | `http://SERVER_IP:6052` | none (LAN only) |
| **Node-RED** | `http://SERVER_IP:1880` | none (LAN only) |
| **go2rtc** | `http://SERVER_IP:1984` | none (LAN only) |
| **InfluxDB** | `http://SERVER_IP:8086` | `.env` INFLUXDB_* |

---

# Deploying updates

After the initial install, use [DEPLOY.md](DEPLOY.md) for uploading code changes and rebuilding containers.

---

# Daily commands (PuTTY)

Always start in the project folder:

```bash
cd ~/damn-home
docker compose up -d          # Start all services
docker compose down           # Stop all services
docker compose ps             # Check status
docker compose logs -f ui     # Dashboard (UI) logs
docker compose logs -f api    # API logs
docker compose logs mosquitto --tail 50
docker compose restart ui api # Restart dashboard + API
```

---

# Adding more ESP32 devices

1. Copy `esphome/living-room.yaml` → new file with new name and `topic_prefix`
2. Flash ESP32
3. Register in **Devices** admin with matching topic prefix

---

# Security

- Use strong unique passwords in `.env`
- Keep all services on your local network only
- Do not port-forward MQTT or the dashboard to the internet without VPN/TLS

---

# Automated setup (optional shortcut)

After Parts A–D are complete, you can use the setup script instead of Part E steps E2–E5:

```bash
cd ~/damn-home
sed -i 's/\r$//' scripts/*.sh
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

The manual steps in Part E are equivalent — use whichever you prefer.
