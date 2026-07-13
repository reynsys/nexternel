#!/bin/bash
# Rebuild the web dashboard container from source on disk.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Project folder: $ROOT ==="

echo "=== Source file checks ==="
missing=0
for f in \
  apps/web/src/components/dashboard/DashboardView.tsx \
  apps/web/src/app/page.tsx \
  apps/web/Dockerfile \
  apps/web/scripts/ensure-dashboard-schema.js
do
  if [ -f "$f" ]; then
    echo "  OK  $f"
  else
    echo "  MISSING  $f"
    missing=1
  fi
done

if ! grep -q "Widget grid" apps/web/src/app/page.tsx 2>/dev/null; then
  echo "  FAIL  page.tsx does not contain 'Widget grid' — upload apps/web/ again"
  missing=1
else
  echo "  OK  page.tsx has Widget grid text"
fi

if [ "$missing" -ne 0 ]; then
  echo ""
  echo "Fix uploads via FileZilla, then run this script again."
  exit 1
fi

echo ""
echo "=== Stopping old web container ==="
docker compose stop web || true

echo ""
echo "=== Building new image (no cache) — may take 5–15 min ==="
if ! docker compose build --no-cache web; then
  echo ""
  echo "BUILD FAILED — scroll up for the error (often npm run build or TypeScript)."
  echo "The old dashboard will stay until this succeeds."
  exit 1
fi

echo ""
echo "=== Starting web container ==="
docker compose up -d web

echo ""
echo "=== Waiting for startup ==="
sleep 5

echo ""
echo "=== Recent logs ==="
docker compose logs web --tail 25

echo ""
echo "=== Version running inside container ==="
if curl -sf http://127.0.0.1:3000/api/version; then
  echo ""
else
  echo "Could not reach /api/version (container may still be starting)"
fi

echo ""
echo "=== Done ==="
echo "Open dashboard in browser and hard-refresh (Ctrl+Shift+R)."
echo "You should see badge: widget-grid-v2 and Edit dashboard button."
