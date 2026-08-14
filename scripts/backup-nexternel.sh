#!/usr/bin/env bash
# Nexternel — read-only full backup (inventory + dump + verify).
# Safe: does NOT stop containers, drop DBs, or modify the installation.
#
# Usage (PuTTY, from project root after upload):
#   chmod +x scripts/backup-nexternel.sh
#   ./scripts/backup-nexternel.sh
#
# Optional:
#   BACKUP_ROOT=~/nexternel-backup-20260808 ./scripts/backup-nexternel.sh
#   SKIP_NEXCFG=1 ./scripts/backup-nexternel.sh   # skip API export if API down

set -euo pipefail

DATE_STAMP="$(date +%Y%m%d)"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/nexternel-backup-$DATE_STAMP}"
MANIFEST_DIR="$BACKUP_ROOT/manifest"
WARNINGS_FILE="$MANIFEST_DIR/warnings.txt"
INVENTORY_FILE="$MANIFEST_DIR/inventory.txt"
CHECKSUMS_FILE="$MANIFEST_DIR/SHA256SUMS.txt"

mkdir -p "$MANIFEST_DIR"
: > "$WARNINGS_FILE"

warn() {
  echo "WARN: $*" | tee -a "$WARNINGS_FILE"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

# --- Locate active Nexternel project ---
PROJECT=""
for candidate in "$HOME/nexternel" "$HOME/damn-home"; do
  if [[ -f "$candidate/docker-compose.yml" ]]; then
    PROJECT="$candidate"
    break
  fi
done

if [[ -z "$PROJECT" ]]; then
  die "No Nexternel project found (expected ~/nexternel or ~/damn-home with docker-compose.yml)"
fi

cd "$PROJECT"
sed -i 's/\r$//' .env 2>/dev/null || true
[[ -f .env ]] || die ".env not found in $PROJECT"

set -a
# shellcheck disable=SC1090
source <(sed 's/\r$//' .env)
set +a

COMPOSE_PROJECT="$(docker compose ls --format json 2>/dev/null | python3 -c "
import json,sys
proj='$(basename \"$PROJECT\")'
for line in sys.stdin:
    line=line.strip()
    if not line: continue
    try:
        o=json.loads(line)
    except: continue
    if o.get('Name')==proj or proj in (o.get('ConfigFiles') or ''):
        print(o.get('Name', proj)); break
else:
    print(proj)
" 2>/dev/null || basename "$PROJECT")"

# --- Inventory (printed and saved) ---
{
  echo "=== Nexternel backup inventory ==="
  echo "backup_date=$(date -Is)"
  echo "project_path=$PROJECT"
  echo "compose_project=$COMPOSE_PROJECT"
  echo "backup_root=$BACKUP_ROOT"
  echo

  echo "--- Git ---"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "git_branch=$(git rev-parse --abbrev-ref HEAD)"
    echo "git_commit=$(git rev-parse HEAD)"
    echo "git_status=$(git status -sb | head -1)"
  else
    echo "git=not-a-repository"
    warn "Project is not a git repository"
  fi
  echo

  echo "--- Version (from repo files) ---"
  if [[ -f apps/ui/src/version.ts ]]; then
    grep APP_VERSION apps/ui/src/version.ts || true
  fi
  if [[ -f apps/api/src/version.ts ]]; then
    grep VERSION_SOFTWARE apps/api/src/version.ts || true
  fi
  API_HEALTH="$(curl -fsS "http://127.0.0.1:${API_PORT:-4000}/api/v1/health" 2>/dev/null || echo '{}')"
  echo "api_health=$API_HEALTH"
  echo

  echo "--- Docker containers ---"
  docker compose ps
  echo

  echo "--- Docker volumes (project) ---"
  docker volume ls | grep -E "${COMPOSE_PROJECT}|nexternel|damn" || docker volume ls
  echo

  echo "--- PostgreSQL ---"
  docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT version();" || warn "PostgreSQL version query failed"
  echo

  echo "--- InfluxDB ---"
  docker compose exec -T influxdb influx version 2>/dev/null || warn "Influx version query failed"
  docker compose exec -T influxdb influx bucket list --org "${INFLUXDB_ORG}" -t "${INFLUXDB_TOKEN}" 2>/dev/null || warn "Influx bucket list failed"
  echo

  echo "--- Database counts ---"
  docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "
    SELECT 'rooms=' || COUNT(*) FROM rooms;
    SELECT 'devices=' || COUNT(*) FROM devices;
    SELECT 'capabilities=' || COUNT(*) FROM capabilities;
    SELECT 'dashboards=' || COUNT(*) FROM v3_dashboards;
    SELECT 'users=' || COUNT(*) FROM users;
    SELECT 'cameras=' || COUNT(*) FROM cameras;
    SELECT 'automations=' || COUNT(*) FROM automations;
  " 2>/dev/null || warn "Database count query failed"
  echo

  echo "--- Config files present ---"
  for f in .env mosquitto/config/mosquitto.conf mosquitto/config/passwd go2rtc/go2rtc.yaml esphome/secrets.yaml; do
    if [[ -e "$f" ]]; then echo "present: $f ($(stat -c%s "$f" 2>/dev/null || stat -f%z "$f") bytes)"; else echo "MISSING: $f"; warn "Missing $f"; fi
  done
  echo

  echo "--- Node-RED live /data (sample) ---"
  NR_CID="$(docker compose ps -q nodered 2>/dev/null || true)"
  if [[ -n "$NR_CID" ]]; then
    docker compose exec -T nodered ls -la /data 2>/dev/null || warn "Cannot list Node-RED /data"
  else
    warn "Node-RED container not running"
  fi
} | tee "$INVENTORY_FILE"

echo
echo "Inventory written to: $INVENTORY_FILE"
echo "Review the inventory above. Starting backup in 5 seconds (Ctrl+C to abort)..."
sleep 5

# --- Backup directories ---
mkdir -p "$BACKUP_ROOT"/{postgres,influxdb,nodered,config,esphome}

echo "=== Backing up PostgreSQL ==="
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc \
  > "$BACKUP_ROOT/postgres/nexternel.dump"

echo "=== Backing up InfluxDB ==="
docker compose exec -T influxdb mkdir -p /tmp/influx-backup
docker compose exec -T influxdb rm -rf /tmp/influx-backup/*
docker compose exec -T influxdb influx backup /tmp/influx-backup \
  -t "${INFLUXDB_TOKEN}" --org "${INFLUXDB_ORG}"
NR_INFLUX_CID="$(docker compose ps -q influxdb)"
docker cp "${NR_INFLUX_CID}:/tmp/influx-backup/." "$BACKUP_ROOT/influxdb/"

echo "=== Backing up Node-RED live volume ==="
docker compose exec -T nodered tar czf /tmp/nodered-data.tgz -C /data .
NR_CID="$(docker compose ps -q nodered)"
docker cp "${NR_CID}:/tmp/nodered-data.tgz" "$BACKUP_ROOT/nodered/nodered-data.tgz"

echo "=== Backing up config files ==="
cp .env "$BACKUP_ROOT/config/env.backup"
cp mosquitto/config/mosquitto.conf "$BACKUP_ROOT/config/" 2>/dev/null || warn "mosquitto.conf copy failed"
cp mosquitto/config/passwd "$BACKUP_ROOT/config/" 2>/dev/null || warn "mosquitto passwd copy failed"
cp go2rtc/go2rtc.yaml "$BACKUP_ROOT/config/" 2>/dev/null || warn "go2rtc.yaml copy failed"

echo "=== Backing up ESPHome (source YAML + secrets; skip .esphome build cache) ==="
mkdir -p "$BACKUP_ROOT/esphome"
# Device YAML and secrets are required; .esphome/ is rebuildable and often root-owned in Docker.
shopt -s nullglob
for f in esphome/*.yaml esphome/*.yml; do
  cp -a "$f" "$BACKUP_ROOT/esphome/"
done
shopt -u nullglob
[[ -f esphome/secrets.yaml ]] && cp -a esphome/secrets.yaml "$BACKUP_ROOT/esphome/"
# Optional extras at repo root of esphome/
for f in esphome/secrets.yaml.example; do
  [[ -f "$f" ]] && cp -a "$f" "$BACKUP_ROOT/esphome/"
done
YAML_COUNT="$(find "$BACKUP_ROOT/esphome" -maxdepth 1 -name '*.yaml' -o -name '*.yml' 2>/dev/null | wc -l)"
if [[ "$YAML_COUNT" -eq 0 ]]; then
  warn "No ESPHome YAML files copied"
else
  echo "ESPHome YAML files backed up: $YAML_COUNT"
fi

echo "=== Exporting .nexcfg via API ==="
if [[ "${SKIP_NEXCFG:-0}" != "1" ]]; then
  LOGIN_JSON="$(curl -fsS -X POST "http://127.0.0.1:${API_PORT:-4000}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}" 2>/dev/null || echo '{}')"
  ACCESS_TOKEN="$(printf '%s' "$LOGIN_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('accessToken',''))" 2>/dev/null || true)"
  if [[ -n "$ACCESS_TOKEN" ]]; then
    curl -fsS -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      "http://127.0.0.1:${API_PORT:-4000}/api/v1/system/config/export" \
      -o "$BACKUP_ROOT/config/nexternel-$(date +%Y-%m-%d).nexcfg" \
      && echo "nexcfg_export=ok" || warn ".nexcfg API export failed"
  else
    warn ".nexcfg skipped — API login failed (export manually from UI: Settings → Export & adopt)"
  fi
else
  warn ".nexcfg skipped (SKIP_NEXCFG=1)"
fi

echo "=== Component sizes ==="
du -sh "$BACKUP_ROOT"/* 2>/dev/null | tee "$MANIFEST_DIR/sizes.txt"

echo "=== SHA256 checksums ==="
( cd "$BACKUP_ROOT" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > "$CHECKSUMS_FILE"

echo "=== Verification ==="
VERIFY_OK=1

if [[ ! -s "$BACKUP_ROOT/postgres/nexternel.dump" ]]; then
  warn "PostgreSQL dump missing or empty"
  VERIFY_OK=0
else
  if docker run --rm -v "$BACKUP_ROOT/postgres:/b:ro" postgres:16-alpine \
    pg_restore -l /b/nexternel.dump >/dev/null 2>&1; then
    echo "OK: pg_restore -l readable"
    docker run --rm -v "$BACKUP_ROOT/postgres:/b:ro" postgres:16-alpine \
      pg_restore -l /b/nexternel.dump | head -8
  else
    warn "pg_restore -l failed — dump may be corrupt"
    VERIFY_OK=0
  fi
fi

if [[ ! -d "$BACKUP_ROOT/influxdb" ]] || [[ -z "$(ls -A "$BACKUP_ROOT/influxdb" 2>/dev/null)" ]]; then
  warn "InfluxDB backup directory empty"
  VERIFY_OK=0
else
  echo "OK: InfluxDB backup files:"
  ls -la "$BACKUP_ROOT/influxdb" | head -10
fi

if tar tzf "$BACKUP_ROOT/nodered/nodered-data.tgz" 2>/dev/null | head -5; then
  echo "OK: Node-RED archive listable"
  tar tzf "$BACKUP_ROOT/nodered/nodered-data.tgz" | grep -E 'flows(_cred)?\.json|package\.json|settings\.js' || warn "Expected Node-RED files not found in archive"
else
  warn "Node-RED archive not listable"
  VERIFY_OK=0
fi

[[ -f "$BACKUP_ROOT/esphome/secrets.yaml" ]] && echo "OK: esphome secrets present" || warn "esphome secrets.yaml not found in backup"
[[ -f "$BACKUP_ROOT/config/env.backup" ]] && echo "OK: .env backed up" || { warn ".env backup missing"; VERIFY_OK=0; }
[[ -f "$BACKUP_ROOT/config/passwd" ]] && echo "OK: Mosquitto passwd backed up" || warn "Mosquitto passwd missing"
ls "$BACKUP_ROOT/config/"*.nexcfg >/dev/null 2>&1 && echo "OK: .nexcfg present" || warn ".nexcfg missing — export from UI if needed"

if sha256sum -c "$CHECKSUMS_FILE" >/dev/null 2>&1; then
  echo "OK: SHA256 checksums pass"
else
  warn "SHA256 checksum verification failed"
  VERIFY_OK=0
fi

echo
echo "Backup root: $BACKUP_ROOT"
echo "Inventory:   $INVENTORY_FILE"
echo "Checksums:   $CHECKSUMS_FILE"
if [[ -s "$WARNINGS_FILE" ]]; then
  echo "Warnings:"
  cat "$WARNINGS_FILE"
fi

if [[ "$VERIFY_OK" -eq 1 ]]; then
  echo
  echo "BACKUP COMPLETE — SAFE TO REVIEW WIPE PLAN"
  echo "Copy $BACKUP_ROOT to your Windows PC via FileZilla before any wipe."
else
  echo
  echo "BACKUP FINISHED WITH WARNINGS — review before wipe"
  exit 1
fi
