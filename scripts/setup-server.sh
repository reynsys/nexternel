#!/bin/bash
# =============================================================================
# DAMN Home - Ubuntu Server Setup Script
# Run on your Ubuntu server after copying project files via FileZilla (FTP)
#
# Usage:
#   chmod +x scripts/setup-server.sh
#   ./scripts/setup-server.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== DAMN Home Server Setup ===${NC}"

# --- Check if running as root for docker install ---
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider using a regular user in the docker group.${NC}"
fi

# --- Install Docker if missing ---
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    echo -e "${GREEN}Docker installed. You may need to log out and back in for group changes.${NC}"
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

# --- Install Docker Compose plugin if missing ---
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose plugin...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# --- Create .env from example if missing ---
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env from .env.example - EDIT THIS FILE before continuing!${NC}"
    echo "  nano .env"
    exit 1
fi

# Load MQTT credentials from .env
# shellcheck disable=SC1091
source "$(dirname "$0")/load-env.sh"

# --- Generate Mosquitto password file ---
echo -e "${YELLOW}Generating Mosquitto password file...${NC}"
if [ -f mosquitto/config/passwd ] && [ ! -w mosquitto/config/passwd ]; then
    sudo rm -f mosquitto/config/passwd
else
    rm -f mosquitto/config/passwd
fi
docker run --rm \
    --user "$(id -u):$(id -g)" \
    -v "$(pwd)/mosquitto/config:/mosquitto/config" \
    eclipse-mosquitto:2 \
    mosquitto_passwd -b -c /mosquitto/config/passwd "${MQTT_USERNAME}" "${MQTT_PASSWORD}"

if [ ! -O mosquitto/config/passwd ] 2>/dev/null; then
    sudo chown "$(id -u):$(id -g)" mosquitto/config/passwd
fi
chmod 644 mosquitto/config/passwd

if [ ! -s mosquitto/config/passwd ]; then
    echo -e "${RED}ERROR: Failed to create mosquitto/config/passwd${NC}"
    exit 1
fi

echo -e "${GREEN}Mosquitto password file created.${NC}"

# --- Copy Node-RED flows template (import manually in Node-RED UI) ---
echo -e "${GREEN}Node-RED flow template ready at nodered/flows.json${NC}"
echo "  Import it via Node-RED: Menu -> Import -> Clipboard / select file"

# --- Update NEXTAUTH_URL with server IP if set ---
if [ -n "$SERVER_IP" ]; then
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://${SERVER_IP}:${WEB_PORT:-3000}|g" .env
fi

# --- Build and start stack ---
echo -e "${YELLOW}Building and starting Docker containers (this may take several minutes)...${NC}"
docker compose up -d --build

echo -e "${YELLOW}Waiting for services to become healthy...${NC}"
sleep 15

# --- Seed admin user ---
echo -e "${YELLOW}Seeding admin user...${NC}"
docker compose exec -T web node scripts/seed-admin.js

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Access your services:"
echo "  Dashboard:  http://${SERVER_IP:-localhost}:${WEB_PORT:-3000}"
echo "  Node-RED:   http://${SERVER_IP:-localhost}:1880"
echo "  InfluxDB:   http://${SERVER_IP:-localhost}:8086"
echo ""
echo "Default admin login (change after first login):"
echo "  Username: ${ADMIN_USERNAME}"
echo "  Password: (value of ADMIN_PASSWORD in .env)"
echo ""
echo "Next steps:"
echo "  1. Open Node-RED and configure Mosquitto broker with MQTT username/password"
echo "  2. Deploy the flows (click Deploy button)"
echo "  3. Open ESPHome at http://${SERVER_IP:-localhost}:6052 (or Admin → Devices → Open ESPHome)"
echo "  4. Register your device in Admin -> Devices"
echo ""
