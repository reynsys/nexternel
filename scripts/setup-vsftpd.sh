#!/bin/bash
# =============================================================================
# DAMN Home - Install and configure vsftpd for FileZilla (FTP)
#
# Run on Ubuntu server via PuTTY (sudo required). Does not need project files.
#
# Usage:
#   chmod +x scripts/setup-vsftpd.sh
#   ./scripts/setup-vsftpd.sh
#   ./scripts/setup-vsftpd.sh YOUR_USERNAME YOUR_SERVER_IP
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FTP_USER="${1:-$USER}"
SERVER_IP="${2:-$(hostname -I | awk '{print $1}')}"
PROJECT_DIR="${3:-nexternel}"
if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}ERROR: Could not detect server IP. Pass it as the second argument.${NC}"
    echo "  ./scripts/setup-vsftpd.sh YOUR_USERNAME YOUR_SERVER_IP"
    exit 1
fi

if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

echo -e "${GREEN}=== Nexternel vsftpd Setup ===${NC}"
echo "  FTP user:     $FTP_USER"
echo "  Server IP:    $SERVER_IP"
echo "  Passive ports: 40000-40100"
echo ""

echo -e "${YELLOW}Installing vsftpd...${NC}"
$SUDO apt-get update
$SUDO apt-get install -y vsftpd

if [ -f /etc/vsftpd.conf ] && [ ! -f /etc/vsftpd.conf.bak ]; then
    $SUDO cp /etc/vsftpd.conf /etc/vsftpd.conf.bak
    echo -e "${GREEN}Backed up /etc/vsftpd.conf to /etc/vsftpd.conf.bak${NC}"
fi

echo -e "${YELLOW}Writing /etc/vsftpd.conf...${NC}"
$SUDO tee /etc/vsftpd.conf > /dev/null <<EOF
# Nexternel - vsftpd (local users, chrooted to home directory)
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
pasv_address=${SERVER_IP}
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist
userlist_deny=NO
seccomp_sandbox=NO
EOF

echo -e "${YELLOW}Allowing FTP user: ${FTP_USER}${NC}"
echo "$FTP_USER" | $SUDO tee /etc/vsftpd.userlist > /dev/null

if id "$FTP_USER" &>/dev/null; then
    $SUDO mkdir -p "/home/${FTP_USER}/${PROJECT_DIR}"
    $SUDO chown "${FTP_USER}:${FTP_USER}" "/home/${FTP_USER}/${PROJECT_DIR}"fi

echo -e "${YELLOW}Opening firewall ports (if ufw is active)...${NC}"
if $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
    $SUDO ufw allow 21/tcp comment 'FTP control'
    $SUDO ufw allow 40000:40100/tcp comment 'FTP passive'
    echo -e "${GREEN}ufw rules added for ports 21 and 40000-40100${NC}"
else
    echo -e "${YELLOW}ufw is not active — skipped firewall rules${NC}"
fi

echo -e "${YELLOW}Starting vsftpd...${NC}"
$SUDO systemctl enable vsftpd
$SUDO systemctl restart vsftpd

if $SUDO systemctl is-active --quiet vsftpd; then
    echo ""
    echo -e "${GREEN}=== vsftpd is running ===${NC}"
    echo ""
    echo "FileZilla Site Manager settings:"
    echo "  Protocol:  FTP - File Transfer Protocol"
    echo "  Host:      ${SERVER_IP}"
    echo "  Port:      21"
    echo "  Logon Type: Normal"
    echo "  User:      ${FTP_USER}"
    echo "  Encryption: Use plain FTP (Transfer Settings tab)"
    echo ""
    echo "Upload project files to: /home/${FTP_USER}/${PROJECT_DIR}/"else
    echo -e "${RED}ERROR: vsftpd failed to start. Check: sudo systemctl status vsftpd${NC}"
    exit 1
fi
