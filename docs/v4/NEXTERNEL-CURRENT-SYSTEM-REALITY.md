# Nexternel V4 — Current System Reality Audit

**Investigation only.** No running systems, databases, devices, MQTT topics, YAML, Node-RED flows, bindings, credentials, or services were modified to produce this document.

**Audit date:** 2026-08-01  
**Server:** `reynsys@damn-nexternel`, `~/nexternel`  
**Document version:** 2 (expanded trace + dependency audit)

---

## Evidence classification

| Label | Meaning |
|-------|---------|
| **RUNTIME** | Observed on the live installation (operator capture, reports) |
| **SOURCE** | Determined from current repository source code |
| **REPO-YAML** | Server-side `esphome/*.yaml` in repository (may match server volume) |
| **UNKNOWN** | Not yet measured — do not treat as fact |

**Priority for diagnosis:** RUNTIME > SOURCE > documentation elsewhere in the repo.

---

## 1. Executive summary

### What is confirmed

1. **Mosquitto receives live MQTT** from six ESPHome devices under `nexternel/…` (RUNTIME).
2. **ESPHome firmware is on the current broker** with topic prefix `nexternel` — **OTA is not established** as the ESPHome problem (RUNTIME).
3. **Garden Relays publishes switch state** e.g. `nexternel/garden-relays/switch/relay_1/state OFF` (RUNTIME).
4. **Utility Room publishes temperature** e.g. `nexternel/utility-room/sensor/utility_room_temperature/state 29.1` (RUNTIME).
5. **CCTV works** via RTSP/go2rtc (operator report — RUNTIME).
6. **Nexternel UI does not show expected live device data** (operator report — RUNTIME).
7. **One Shelly Gen3 Mini** publishes at least `shelly1minig3-cc8da25b0074/online false` (RUNTIME).
8. **No Shelly Gen1 `shellies/…` traffic** in the 30s capture (RUNTIME negative).

### What is not yet proven

The exact failure layer between **Mosquitto → Nexternel API → capability → WebSocket → UI** for any single device. PostgreSQL row data, API message receipt, WebSocket events, and Influx writes were **not queried** in this audit.

### Failure case model (A–E)

| Case | Description | ESPHome (6 devices) | Shelly Gen3 (1 seen) |
|------|-------------|---------------------|----------------------|
| **A** | Device not publishing | **RULED OUT** (RUNTIME) | **PARTIAL** (only `online`) |
| **B** | Mosquitto receives, API does not | **UNKNOWN** — likely if DB `mqtt_topic_prefix` ≠ `nexternel/…` | **UNKNOWN** |
| **C** | API receives, cannot map to capability | **UNKNOWN** — likely if `binding.state_topic` ≠ published topic | **UNKNOWN** |
| **D** | Capability cache updates, WebSocket fails | **UNKNOWN** | **UNKNOWN** |
| **E** | WebSocket OK, UI/widget fails | **UNKNOWN** (stale dashboard `capabilityId` possible — SOURCE) | **UNKNOWN** |

---

## 2. Running software inventory

| Component | Version | Container | Purpose | Port | Status |
|-----------|---------|-----------|---------|------|--------|
| Nexternel API | V4.0.038 (REPO) / **UNKNOWN** (runtime UI chip) | `nexternel-api` | REST, WS, MQTT client, capabilities | 4000 | **LIKELY** up |
| Nexternel UI | V4.0.038 (REPO) | `nexternel-ui` | SPA + nginx proxy | 8080 | **LIKELY** up |
| PostgreSQL | 16-alpine | `nexternel-postgres` | Config domain | 5432 | **LIKELY** up |
| InfluxDB | 2.7-alpine | `nexternel-influxdb` | History | 8086 | **UNKNOWN** |
| Mosquitto | eclipse-mosquitto:2 | `nexternel-mosquitto` | MQTT broker | 1883, 9001 | **CONFIRMED** receiving |
| Node-RED | 3.1 | `nexternel-nodered` | Automations / **likely** Influx writes | 1880 | **UNKNOWN** |
| ESPHome | ghcr.io/esphome/esphome | `nexternel-esphome` (host net) | OTA/compile | 6052 host | **CONFIRMED** devices on LAN |
| go2rtc | 1.9.9 | `nexternel-go2rtc` | RTSP restream | 1984 | **CONFIRMED** CCTV path |
| nginx | in UI image | `nexternel-ui` | `/api/` + `/go2rtc/` proxy | 80 | SOURCE |

**MQTT environment (RUNTIME, secrets redacted):**

| Variable | Value |
|----------|-------|
| `MQTT_BROKER` (API internal) | `mqtt://mosquitto:1883` |
| `MQTT_USERNAME` | `nexternel` |
| `MQTT_PASSWORD` | `<REDACTED>` |
| `MQTT_TOPIC_PREFIX` | `nexternel` |

Physical devices use **host LAN IP:1883**, not the Docker DNS name `mosquitto`.

---

## 3. Hardware / device inventory

### 3.1 RUNTIME — MQTT-active devices (30s `#` sniff)

| Device | Chip | IP | MAC | MQTT prefix | Publishing |
|--------|------|-----|-----|-------------|------------|
| Glow Energy | ESP8266 | 192.168.3.4 | ecfabc6305c1 | `nexternel/glow-energy` | Yes |
| Utility Room | ESP32 | 192.168.3.8 | c8c9a3f9b7f0 | `nexternel/utility-room` | Yes |
| Living Room | ESP32 | 192.168.3.9 | 94b97efa33ec | `nexternel/living-room` | Yes |
| Kids Room | ESP32 | 192.168.3.10 | 94b97efa9444 | `nexternel/kids-room` | Yes |
| Air Quality | ESP8266 | 192.168.3.6 | a848fadc8f78 | `nexternel/air-quality` | Yes |
| Garden Relays | ESP32 | 192.168.3.116 | 704bca6e7bf8 | `nexternel/garden-relays` | Yes |
| Shelly Mini Gen3 | Shelly | **UNKNOWN** | **UNKNOWN** | `shelly1minig3-cc8da25b0074` | Partial (`online false`) |

### 3.2 REPORTED but not observed on MQTT

| Type | Status |
|------|--------|
| Shelly Gen 1 | **UNKNOWN** — no `shellies/…` in sniff |
| Additional Shelly Gen 3 | **UNKNOWN** — only one prefix seen |
| `v4-climate-node` | REPO-YAML exists; **not** in sniff |
| Octopus integration | **UNKNOWN** — no `octopus/…` in sniff |
| CCTV cameras | RTSP — working per operator |

### 3.3 PostgreSQL device IDs, areas, capability counts

**UNKNOWN** — requires read-only SQL (queries in §9).

---

## 4. Trace — Garden Relays (switch path)

### 4.1 Physical → Mosquitto (RUNTIME)

| Field | Value | Evidence |
|-------|-------|----------|
| Physical device | Garden Relays ESP32 | `esphome/discover/garden-relays` |
| Firmware | ESPHome 2026.7.3 | discover JSON |
| IP | 192.168.3.116 | discover JSON |
| MQTT broker | LAN server :1883 | **UNKNOWN** exact IP; inferred from deployment |
| MQTT topic prefix | `nexternel/garden-relays` | RUNTIME sniff |
| Published state topic (relay 1) | `nexternel/garden-relays/switch/relay_1/state` | RUNTIME, payload `OFF` |
| Published command topic (relay 1) | `nexternel/garden-relays/switch/relay_1/command` | **NOT observed** in sniff; SOURCE convention |
| Retained status | `nexternel/garden-relays/status` → `offline` | RUNTIME (while switches publish) |

### 4.2 REPO-YAML vs firmware

| Field | REPO-YAML (`garden-relays.yaml`) | Firmware (RUNTIME) |
|-------|----------------------------------|---------------------|
| `topic_prefix` | `nexternel/garden-relays` | **Matches** |
| Switch IDs | `relay_1` … `relay_4` | **Matches** published topics |
| MQTT username | `nexternel` inline | **UNKNOWN** credential on device; auth works |

### 4.3 PostgreSQL (UNKNOWN — must query)

| Field | Expected if correct (SOURCE) | Actual |
|-------|------------------------------|--------|
| Device ID | UUID | **UNKNOWN** |
| Device name | e.g. `Garden Relays` | **UNKNOWN** |
| `devices.mqtt_topic_prefix` | `nexternel/garden-relays` | **UNKNOWN** |
| Relay slug | `relay_1` | **UNKNOWN** |
| `relays.mqtt_state_topic` | `nexternel/garden-relays/switch/relay_1/state` | **UNKNOWN** |
| `relays.mqtt_command_topic` | `nexternel/garden-relays/switch/relay_1/command` | **UNKNOWN** |
| Capability ID (relay 1) | UUID | **UNKNOWN** |
| Capability name | e.g. `Relay 1` | **UNKNOWN** |
| Capability kind | `switch` | **UNKNOWN** |
| Binding `state_topic` | same as relay state topic | **UNKNOWN** |
| Binding `command_topic` | same as relay command topic | **UNKNOWN** |

**If `devices.mqtt_topic_prefix` ≠ `nexternel/garden-relays` → Case B (API subscribed to wrong `#` tree).**  
**If prefix correct but `binding.state_topic` ≠ published topic → Case C (message received on `#` but not indexed).**

### 4.4 API MQTT subscription (SOURCE)

**File:** `apps/api/src/telemetry/mqtt.ts`  
**Function:** `startTelemetry()` → on `connect`:

1. `rebuildTopicIndex()` loads `capability_bindings.state_topic` into `topicIndex` Map.
2. `listDevicePrefixes()` → `SELECT DISTINCT mqtt_topic_prefix FROM devices` (`apps/api/src/capabilities/store.ts`).
3. Subscribes to **`{each prefix}/#`** plus each exact `state_topic` from bindings.

**Answer:** Subscriptions come **from PostgreSQL device rows**, not from a single `nexternel/#` wildcard.

**API broker connection (SOURCE):** `config.mqttBroker()` → `MQTT_BROKER` env (`mqtt://mosquitto:1883` inside Docker). Username `MQTT_USERNAME` (`nexternel`). Password `<REDACTED>`.

### 4.5 MQTT message handling for `…/switch/relay_1/state` (SOURCE)

**File:** `apps/api/src/telemetry/mqtt.ts`  
**Entry:** `client.on("message")` → `handleMessage(topic, payload, packet)`

Path for ESPHome switch (if binding matches):

```text
handleMessage
  → topicIndex.get("nexternel/garden-relays/switch/relay_1/state")
  → if match: parseMqttPayload("switch", "OFF") → false
  → applyLiveCapability(capabilityId, false, retained, "switch")
  → setLiveState in state-cache.ts
  → subscribeLive listeners (WebSocket)
```

If **no** `topicIndex` match:

```text
handleMessage
  → tryHealEsphomeSwitchTopic()  (regex: ^(.+)/switch/([^/]+)/state$)
  → may UPDATE relays + capability_bindings in DB if prefix matches device row
  → registerTopicBinding + applyLiveCapability
```

**RUNTIME:** Whether API receives this message → **UNKNOWN**.

### 4.6 Telemetry cache → WebSocket → UI (SOURCE)

| Step | Implementation | Garden Relays value |
|------|----------------|---------------------|
| API cache | `apps/api/src/telemetry/state-cache.ts` | **UNKNOWN** capability UUID |
| WebSocket hello | `apps/api/src/telemetry/ws.ts` sends `getAllLiveStates()` | **UNKNOWN** |
| WebSocket update | `capability.updated` event | **UNKNOWN** |
| UI socket | `apps/ui/src/api.ts` `connectLiveSocket()` → `ws://{origin}/api/v1/ws?access_token=…` | **UNKNOWN** connected? |
| UI cache | `liveStateByCapability` Map | **UNKNOWN** |
| Dashboard | `DashboardPage.tsx` applies `capability.updated` via `applyLive()` | **UNKNOWN** |
| Widget | `SwitchWidget` + `useSwitchControl` reads `cap.state.value` | **UNKNOWN** displayed |

### 4.7 End-to-end value chain (Garden Relay 1)

| Stage | Value | Status |
|-------|-------|--------|
| MQTT published | `OFF` (boolean false) | **PASS** (RUNTIME) |
| API in-memory state | — | **UNKNOWN** |
| WebSocket event | — | **UNKNOWN** |
| UI displayed | — | **UNKNOWN** (operator: not working) |

---

## 5. Trace — Utility Room temperature (sensor path)

### 5.1 Physical → Mosquitto (RUNTIME)

| Field | Value |
|-------|-------|
| Published topic | `nexternel/utility-room/sensor/utility_room_temperature/state` |
| Published value | `29.1` |
| Entity ID on wire | `utility_room_temperature` |

### 5.2 REPO-YAML

| Field | Value |
|-------|-------|
| DHT sensor id | `utility_room_temperature` (`utility-room.yaml`) |
| Expected topic (SOURCE formula) | `nexternel/utility-room/sensor/utility_room_temperature/state` |

**Topic formula (SOURCE):** `insertSensorsAndRelays` / `upsertSensorFromSuggestion`:

```text
{mqttTopicPrefix}/sensor/{esphomeEntityId}/state
```

### 5.3 PostgreSQL (UNKNOWN)

| Field | Expected if correct |
|-------|---------------------|
| `devices.mqtt_topic_prefix` | `nexternel/utility-room` |
| `sensors.esphome_entity_id` | `utility_room_temperature` |
| `sensors.mqtt_state_topic` | `nexternel/utility-room/sensor/utility_room_temperature/state` |
| `capability_bindings.state_topic` | same |
| Capability kind | `temperature` (from `kindFromSensorType`) |

### 5.4 API handler (SOURCE)

Same as switches, but:

- `topicIndex` exact match on state topic, **or**
- `tryHealEsphomeSensorTopic()` regex: `^(.+)/sensor/([^/]+)/state$`

Sensor path does **not** use Shelly parser.

### 5.5 Value chain

| Stage | Value | Status |
|-------|-------|--------|
| MQTT | `29.1` | **PASS** |
| API cache | — | **UNKNOWN** |
| WebSocket | — | **UNKNOWN** |
| UI | — | **UNKNOWN** |

---

## 6. Trace — Shelly devices

### 6.1 Shelly Gen 3 Mini (RUNTIME partial)

| Field | Value |
|-------|-------|
| Model / generation | Shelly 1 Mini Gen3 (from topic name) |
| MQTT prefix | `shelly1minig3-cc8da25b0074` (device-native, **not** `nexternel/`) |
| Observed topic | `shelly1minig3-cc8da25b0074/online` → `false` |
| Switch/status topics | **Not observed** in 30s window |
| IP | **UNKNOWN** |
| Nexternel device ID | **UNKNOWN** |
| Capabilities / bindings | **UNKNOWN** |

**SOURCE expected Gen3 topics:** `{prefix}/status/switch:0`, `{prefix}/events/rpc`, commands via `{prefix}/command`.

**Assessment:** Device appears **offline** at MQTT presence layer. Separate from ESPHome. Case A or device/network for Shelly; **not proven** Nexternel mapping issue.

### 6.2 Shelly Gen 1

| Field | Value |
|-------|-------|
| MQTT traffic | **None** in 30s sniff |
| Expected prefix (SOURCE) | `shellies/shelly1-{id}` |
| Nexternel records | **UNKNOWN** |

**Assessment:** **UNKNOWN** — device offline, wrong broker, not MQTT-enabled, or quiet during capture.

---

## 7. MQTT topology

### 7.1 Active topic families (RUNTIME)

```text
nexternel/{device}/sensor/{entity}/state
nexternel/{device}/switch/{entity}/state
nexternel/{device}/status          (retained offline)
nexternel/{device}/debug
esphome/discover/{name}            (not consumed by API for live state)
shelly1minig3-cc8da25b0074/online
```

### 7.2 What Nexternel API subscribes to (SOURCE — not verified live)

Per device row `mqtt_topic_prefix` `P`:

- `P/#`  (wildcard under prefix)

Plus each `capability_bindings.state_topic` exactly.

**Does not subscribe to:** global `nexternel/#` unless a device row has prefix exactly `nexternel` (unlikely).

### 7.3 What Nexternel API publishes (SOURCE)

- Switch commands: `capability_bindings.command_topic`
- Shelly discovery: `shellies/command`, `{prefix}/command` status probes

---

## 8. PostgreSQL domain model reality

### 8.1 Schema (SOURCE)

```text
rooms (areas)
  └── devices (mqtt_topic_prefix, firmware_type, is_online, …)
        ├── sensors (mqtt_state_topic, esphome_entity_id)
        ├── relays (mqtt_state_topic, mqtt_command_topic, esphome_entity_id)
        └── capabilities (kind, source_type, source_id, system_id, area_id, …)
              └── capability_bindings (state_topic, command_topic, protocol='mqtt')

v3_dashboards (document JSONB → widgets with capabilityId)
cameras (RTSP — parallel to MQTT)
systems, groups (V4 taxonomy)
octopus_settings (optional HTTPS integration)
installation_meta (setup wizard state)
automations (DB table — legacy vs Node-RED: UNKNOWN)
```

### 8.2 Source of truth (SOURCE)

| Data | Authoritative table |
|------|---------------------|
| MQTT prefix per device | `devices.mqtt_topic_prefix` |
| Entity topics | `sensors` / `relays` |
| Live subscription index | `capability_bindings` (synced from sensors/relays on startup) |
| Dashboard widget target | `v3_dashboards.document` → `bindings.capabilityId` |

### 8.3 Integrity checks — **NOT RUN** (read-only queries for operator)

**Counts:**

```sql
SELECT 'rooms' AS t, COUNT(*) FROM rooms
UNION ALL SELECT 'devices', COUNT(*) FROM devices
UNION ALL SELECT 'sensors', COUNT(*) FROM sensors
UNION ALL SELECT 'relays', COUNT(*) FROM relays
UNION ALL SELECT 'capabilities', COUNT(*) FROM capabilities
UNION ALL SELECT 'capability_bindings', COUNT(*) FROM capability_bindings
UNION ALL SELECT 'v3_dashboards', COUNT(*) FROM v3_dashboards
UNION ALL SELECT 'cameras', COUNT(*) FROM cameras
UNION ALL SELECT 'systems', COUNT(*) FROM systems
UNION ALL SELECT 'groups', COUNT(*) FROM groups;
```

**Devices:**

```sql
SELECT id, name, slug, firmware_type, mqtt_topic_prefix, is_online, last_seen_at, room_id
FROM devices ORDER BY name;
```

**Garden Relays + Utility Room detail:**

```sql
SELECT d.name, d.mqtt_topic_prefix, r.slug, r.esphome_entity_id,
       r.mqtt_state_topic, r.mqtt_command_topic,
       c.id AS capability_id, c.kind, c.name AS cap_name,
       b.state_topic, b.command_topic
FROM devices d
LEFT JOIN relays r ON r.device_id = d.id
LEFT JOIN capabilities c ON c.source_type = 'relay' AND c.source_id = r.id
LEFT JOIN capability_bindings b ON b.capability_id = c.id
WHERE d.slug IN ('garden-relays') OR d.mqtt_topic_prefix LIKE '%garden-relays%'
ORDER BY r.slug;

SELECT d.name, d.mqtt_topic_prefix, s.slug, s.esphome_entity_id, s.sensor_type,
       s.mqtt_state_topic, c.id AS capability_id, b.state_topic
FROM devices d
JOIN sensors s ON s.device_id = d.id
LEFT JOIN capabilities c ON c.source_type = 'sensor' AND c.source_id = s.id
LEFT JOIN capability_bindings b ON b.capability_id = c.id
WHERE d.slug = 'utility-room' OR s.esphome_entity_id = 'utility_room_temperature';
```

**Integrity anomalies (run, do not fix):**

```sql
-- Capabilities without bindings
SELECT c.id, c.name, d.name FROM capabilities c
JOIN devices d ON d.id = c.device_id
LEFT JOIN capability_bindings b ON b.capability_id = c.id
WHERE b.id IS NULL;

-- Bindings without capabilities
SELECT b.* FROM capability_bindings b
LEFT JOIN capabilities c ON c.id = b.capability_id
WHERE c.id IS NULL;

-- Devices with no capabilities
SELECT d.id, d.name FROM devices d
LEFT JOIN capabilities c ON c.device_id = d.id
WHERE c.id IS NULL AND COALESCE(d.firmware_type,'esphome') <> 'octopus';

-- Prefix mismatch vs MQTT_TOPIC_PREFIX (if old damnhome rows exist)
SELECT name, mqtt_topic_prefix FROM devices
WHERE mqtt_topic_prefix NOT LIKE 'nexternel/%'
  AND firmware_type = 'esphome';
```

**Dashboard orphan capability IDs:** requires JSON inspection of `v3_dashboards.document` — **UNKNOWN**.

---

## 9. Capability / binding reality

**Live capability list:** **UNKNOWN** (no SQL export).

**SOURCE sync path:** On API startup, `syncCapabilitiesFromLegacy()` copies `sensors.mqtt_state_topic` → `capability_bindings.state_topic` and relay command/state topics.

**Distinction to establish per capability:**

| State | Meaning |
|-------|---------|
| Capability exists, `state` null in `/api/v1/capabilities` | API never received / never mapped MQTT |
| Capability exists, stale `state` | Received once or retained; not updating |
| No capability | Device row without sync / orphan sensor |

---

## 10. API MQTT subscription architecture (SOURCE)

| Question | Answer |
|----------|--------|
| Broker hostname (API container) | `mosquitto` (Docker DNS) → port 1883 |
| Username | `MQTT_USERNAME` env (`nexternel`) |
| Password | `MQTT_PASSWORD` env (`<REDACTED>`) |
| Client ID | `nexternel-api-{timestamp}` |
| Subscription source | **`listDevicePrefixes()` from `devices` table** |
| Pattern | `{mqtt_topic_prefix}/#` per device + exact binding topics |
| Rebuilt when | API start, `refreshTelemetrySubscriptions()` after sync |

**Relevant files:**

- `apps/api/src/telemetry/mqtt.ts` — `startTelemetry`, `handleMessage`, `rebuildTopicIndex`
- `apps/api/src/capabilities/store.ts` — `listDevicePrefixes`, `listStateTopicBindings`, `listShellySwitchBindings`

---

## 11. MQTT message handling (SOURCE)

```text
MQTT message
  ↓ client.on("message")                    [mqtt.ts]
  ↓ handleMessage()
  ↓ optional: applyDeviceRootStatusTopic     ( {prefix}/status )
  ↓ optional: applyDeviceShellyOnlineTopic   ( {prefix}/online )
  ↓ optional: applyShellyTopicUpdates        ( Shelly only )
  ↓ topicIndex.get(exact topic)              ( from capability_bindings )
  ↓ if miss: tryHealEsphomeSensorTopic       ( async, may write DB )
  ↓ if miss: tryHealEsphomeSwitchTopic       ( async, may write DB )
  ↓ parseMqttPayload(kind, payload)
  ↓ applyLiveCapability → setLiveState
  ↓ subscribeLive → WebSocket send
```

**Note:** Self-heal paths **can modify database** when a message arrives on a healable topic shape. This audit did not trigger them.

---

## 12. WebSocket / live-data path (SOURCE)

| Step | File |
|------|------|
| WS endpoint | `apps/api/src/telemetry/ws.ts` `/api/v1/ws` |
| Auth | JWT access token in query `access_token` |
| Initial snapshot | `{ type: "hello", states: getAllLiveStates() }` |
| Updates | `{ type: "capability.updated", state: LiveCapabilityState }` |
| UI connect | `apps/ui/src/api.ts` `connectLiveSocket()` |
| UI consumers | `DashboardPage.tsx`, `useResolvedPanel.ts`, panel widgets |

**RUNTIME:** WebSocket connected? Events received? **UNKNOWN**.

---

## 13. UI live-data path (SOURCE)

| Component | Behaviour |
|-----------|-----------|
| Capabilities load | `GET /api/v1/capabilities` merges `getAllLiveStates()` |
| Live updates | WebSocket → `recordLiveCapabilityState` → widget re-render |
| Switch display | `useSwitchControl` uses `cap.state.value === true` |
| Switch command | `POST /api/v1/capabilities/:id/command` |
| Dashboard binding | Widget `bindings.capabilityId` must match live capability UUID |

**Failure mode E (SOURCE):** After restore, dashboard JSON may reference **old capability UUIDs**. API startup runs `repairDashboardCapabilityBindings()` but effectiveness on this install is **UNKNOWN**.

---

## 14. Node-RED

| Function | Required for live UI? | Evidence |
|----------|----------------------|----------|
| Live telemetry | **No** (SOURCE — API consumes MQTT directly) | Code path |
| Historical charts | **Likely yes** | `history/influx.ts` expects Node-RED writes |
| Commands | **No** | API publishes directly |
| Automations | **Optional** | **UNKNOWN** flows |

**Active flows:** **UNKNOWN** — stored in Docker volume `nodered_data`, not in repository.

---

## 15. InfluxDB

| Field | Value |
|-------|-------|
| Measurement (SOURCE) | `sensor_reading` |
| Tags | `device` (slug), `entity_id` |
| Field | `value` |
| Writer (SOURCE comment) | Node-RED |
| Retention | 30d (compose init) |
| Live points for utility-room temp | **UNKNOWN** |

**Test query (read-only, operator):** use Influx UI or CLI on bucket `sensors` (name from `.env` — **UNKNOWN** exact bucket if customized).

---

## 16. Cameras / go2rtc

| Step | Path |
|------|------|
| Config | `cameras` table → API `syncAllCamerasToGo2rtc()` |
| Stream | RTSP → go2rtc → UI `/go2rtc/` proxy |
| MQTT | **Not used** |
| Status | **PASS** per operator (CCTV works) |

---

## 17. Legacy V1 / V3 / V4 relationships

| Evidence | Interpretation |
|----------|----------------|
| `nexternel/` MQTT prefix | Current installation naming |
| Glow HA project metadata | Home Assistant → ESPHome migration |
| `damn_nexternel` in some YAML substitutions | Legacy username in repo files |
| `systems`, `groups`, V4 routes | V4 schema present in code |
| `v3_dashboards` table name | V3 dashboard document retained |
| `installation_meta` setup wizard | V4 fresh-install path |
| Backup/restore V4 code | Recent restore on this server (**LIKELY**) |

**Duplicate/orphan records:** **UNKNOWN** until integrity SQL run.

---

## 18. Device health matrix

### 18.1 By device type

| Device type | Count (observed) | Broker | API receives | Capability maps | Live cache | WebSocket | UI | History | Command |
|-------------|------------------|--------|--------------|-----------------|------------|-----------|-----|---------|---------|
| ESPHome | 6 | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL* | UNKNOWN | UNKNOWN |
| Shelly Gen3 | ≥1 | PARTIAL | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL* | UNKNOWN | UNKNOWN |
| Shelly Gen1 | 0 seen | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL* | UNKNOWN | UNKNOWN |
| CCTV/RTSP | ≥1 | N/A | N/A | N/A | N/A | N/A | PASS | N/A | N/A |
| Octopus | ? | N/A | N/A | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | N/A |
| Weather | — | HTTPS | N/A | N/A | N/A | N/A | UNKNOWN | N/A | N/A |

\*Operator report: live MQTT devices not showing as expected in UI.

### 18.2 Individual devices (MQTT-confirmed)

| Device | Protocol | Broker | API recv | Cap map | Cache | WS | UI | History | Command | Broken layer |
|--------|----------|--------|----------|---------|-------|----|----|---------|---------|--------------|
| garden-relays | ESPHome | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | UNKNOWN | **UNKNOWN** |
| utility-room (temp) | ESPHome | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | N/A | **UNKNOWN** |
| glow-energy | ESPHome | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | N/A | **UNKNOWN** |
| living-room | ESPHome | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | N/A | **UNKNOWN** |
| kids-room | ESPHome | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | N/A | **UNKNOWN** |
| air-quality | ESPHome | PASS | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | UNKNOWN | **UNKNOWN** |
| shelly1minig3-… | Shelly G3 | PARTIAL | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | FAIL | UNKNOWN | UNKNOWN | Device offline? |

---

## 19. Confirmed failures

1. Nexternel UI does not show expected live data for MQTT devices (operator).
2. ESPHome retained `status offline` on all six devices while publishing sensors (RUNTIME) — may cause misleading `is_online` in DB if only status is processed.

## 20. Likely failures (not proven)

1. **Case B:** DB `mqtt_topic_prefix` still uses pre-restore value (e.g. `damnhome/…`) while devices publish `nexternel/…`.
2. **Case C:** Bindings out of sync with published topic paths after restore.
3. **Case E:** Dashboard widgets reference obsolete `capabilityId` UUIDs.
4. Shelly Gen3 offline (device/network), independent of ESPHome.

## 21. Unknowns

- All PostgreSQL UUIDs and exact binding strings for traced devices.
- Whether API MQTT client receives garden-relays / utility-room messages.
- WebSocket connection and event payload in browser.
- Node-RED flow contents and Influx write activity.
- Full Shelly inventory (Gen1 + all Gen3).
- Octopus enabled/disabled.
- Runtime deployed API/UI version vs repository V4.0.038.

---

## 22. Exact evidence collected

1. **MQTT sniff** — 30s `#` on Mosquitto, user `nexternel`, password `<REDACTED>` — six ESPHome device trees + one Shelly Gen3 online topic.
2. **Operator reports** — MQTT connected in UI; CCTV works; other live data not working.
3. **Repository source code** — subscription, handler, WebSocket, UI paths documented above.
4. **REPO-YAML** — topic prefixes and entity IDs for garden-relays and utility-room match RUNTIME topics **if** DB was synced from YAML.

---

## 23. Recommended NEXT INVESTIGATION ONLY

No fixes. No deploys. No repairs.

1. Run the **read-only SQL** in §8.3 on the server and paste results (redact nothing except passwords — there should be none in these queries).
2. In browser DevTools → Network → WS → `/api/v1/ws`: note whether `hello` contains states for Garden Relays / Utility Room capability IDs from SQL.
3. Optional: `docker logs nexternel-api 2>&1 | tail -100` after a sensor publishes — look for MQTT connect/subscribe errors only.

---

## The single most useful next test

**Side-by-side read-only comparison for Garden Relays relay 1 and Utility Room temperature:**

| Source | What to capture |
|--------|-----------------|
| **MQTT (already have)** | `nexternel/garden-relays/switch/relay_1/state` |
| **PostgreSQL (run once)** | `devices.mqtt_topic_prefix`, `relays.mqtt_state_topic`, `capability_bindings.state_topic` for those entities |
| **Browser WebSocket (optional)** | Whether `capability.updated` fires for the capability UUID from SQL |

**One outcome decides the layer:**

- If DB prefix is `damnhome/garden-relays` (or anything ≠ `nexternel/garden-relays`) → **Case B** proven.
- If DB prefix matches but `binding.state_topic` ≠ published topic → **Case C** proven.
- If DB matches and WebSocket shows updates but UI does not → **Case E** proven.
- If DB matches and WebSocket silent → **Case B or D** — then check API logs for subscription list.

**Do not implement anything until this comparison is reviewed.**

---

*End of audit. Await further instructions.*
