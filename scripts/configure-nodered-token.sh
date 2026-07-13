#!/bin/bash
# Updates nodered/flows.json with your InfluxDB token from .env
# Run after editing .env: ./scripts/configure-nodered-token.sh

set -e
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source "$(dirname "$0")/load-env.sh"

if [ -z "$INFLUXDB_TOKEN" ]; then
  echo "INFLUXDB_TOKEN not set in .env"
  exit 1
fi

cp nodered/flows.json nodered/flows.json.bak
sed "s/REPLACE_WITH_INFLUXDB_TOKEN/${INFLUXDB_TOKEN}/g" nodered/flows.json.bak > nodered/flows.json
echo "Updated nodered/flows.json with InfluxDB token."
echo "Re-import the flow in Node-RED if already deployed."
