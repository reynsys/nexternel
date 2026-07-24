# Nexternel V3.1.1 — Software Architecture Specification (SAS)

| Field | Value |
|-------|--------|
| **Document** | Software Architecture Specification |
| **Product** | Nexternel |
| **Version** | V3.1.1 |
| **Status** | Draft — pending review & approval |
| **Baseline** | V2.1.207 |
| **Audience** | Engineering, architects, security, operations |
| **Related** | [Master Plan](00-MASTER-ARCHITECTURE-PLAN.md) · [Vision](01-VISION.md) · [PRD](03-PRD.md) · [Migration Plan](05-IMPLEMENTATION-MIGRATION-PLAN.md) |
| **Governing charter** | Master Architecture Plan takes precedence on conflicts until ADR revises |

---

## Executive Summary

Nexternel V3.1.1 separates the **control plane** (Backend API + React SPA) from the **data plane** (Mosquitto, Node-RED, InfluxDB, PostgreSQL). The UI never connects to MQTT, InfluxDB, or PostgreSQL. Devices are modelled as **capability bags**. Dashboards are JSON layouts rendered by a widget engine. Plugins extend widgets, drivers, and services without forking core.

This SAS implements the [Master Architecture Plan](00-MASTER-ARCHITECTURE-PLAN.md). V2 architectural review findings live there; this document specifies the **target** system.

**Decisions locked for V3.1.1 (pending formal approval of this SAS):**

| Decision | Choice |
|----------|--------|
| API runtime | **Fastify** (TypeScript) — see framework evaluation below |
| SPA | **Vite + React + TypeScript** |
| UI kit | **Material UI (MUI)** — dark mode, responsive, desktop-first |
| Charts / gauges | **Apache ECharts only** (no competing chart libs) |
| Dashboard grid | **React Grid Layout** |
| Client state | **Zustand** |
| SPA routing | **React Router** |
| Live updates | **WebSocket from Backend API** (not browser MQTT) |
| Auth | **JWT access + refresh tokens**, RBAC |
| Config store | **PostgreSQL** |
| History store | **InfluxDB only** |
| Automations runtime | **Node-RED** (first-class external) |

---

## Backend Framework Evaluation

### Fastify vs Express

| Criterion | Fastify | Express | Winner for Nexternel |
|-----------|---------|---------|----------------------|
| TypeScript / schema typing | Excellent (type providers, JSON Schema) | Manual / weaker defaults | Fastify |
| Performance | Higher throughput, lower overhead | Adequate for LAN | Fastify |
| Validation | First-class plugins (TypeBox/Zod) | Add-on middleware | Fastify |
| WebSocket (telemetry) | Strong, plugin-oriented | DIY / third-party variance | Fastify |
| Modular plugins | Aligns with platform Plugin Manager | Middleware-centric | Fastify |
| Ecosystem size | Sufficient for API servers | Largest in Node | Express (marginal) |
| Maintainability | Encapsulated plugins, clear lifecycle | Familiar but easy to sprawl | Fastify |
| Debugging | Predictable request lifecycle | Very well known | Tie |
| AI / codegen friendliness | Schema-driven routes | Highly represented in training data | Tie |
| Long-term suitability | Modular monolith → extract services | Possible but less structured | **Fastify** |

**Decision: Fastify.** Express only via approved ADR if team constraints override.

---

## Data Flow

### Live control path

```
Device → MQTT → Mosquitto → Protocol/Device Driver → Capability Mapper
  → Telemetry Service (validate, cache, availability)
  → WebSocket → React Dashboard / Widgets
```

### Command path

```
User → SPA → REST command → Capability Service (authz)
  → Telemetry/Driver → MQTT publish → Device
  → state update → WebSocket fan-out
```

### History path

```
Device → MQTT → Mosquitto → Node-RED → InfluxDB
                              ↑
SPA → REST History API → History Service → InfluxDB (read)
```

### Config path

```
SPA → REST → Dashboard / Device / User / Plugin services → PostgreSQL
```

---

## System Context

```
┌─────────────┐     MQTT      ┌──────────┐
│ ESP32 /     │──────────────►│ Mosquitto│
│ ESPHome     │◄──────────────│          │
└─────────────┘               └────┬─────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐   ┌────────────┐
              │ Node-RED │  │ Backend  │   │ (optional  │
              │ flows    │  │ API      │   │ other MQTT │
              └────┬─────┘  │ Fastify  │   │ consumers) │
                   │        └────┬─────┘   └────────────┘
                   │ writes      │ owns
                   ▼             │
              ┌──────────┐       │
              │ InfluxDB │◄──────┘ reads history
              └──────────┘
                             │
                             │ CRUD config
                             ▼
                        ┌──────────┐
                        │PostgreSQL│
                        └──────────┘

┌─────────────┐  REST + WS   ┌────────────┐
│ React SPA   │◄────────────►│ Backend API│
│ (browser)   │              │            │
└─────────────┘              └────────────┘
```

**Hard rule:** The browser talks only to the Backend API (and static SPA assets).

---

## Architecture Overview

| Layer | Responsibility |
|-------|----------------|
| **Presentation** | React SPA — dashboards, admin, auth UI |
| **API / Application** | Fastify — auth, config, telemetry fan-out, commands, history queries |
| **Integration** | MQTT drivers, ESPHome import, Node-RED health link |
| **Persistence** | PostgreSQL (config), InfluxDB (series) |
| **Messaging** | Mosquitto (device bus) |
| **Automation** | Node-RED (flows; not reimplemented in V3.1.1) |

Logical services inside Fastify may run in-process initially (modular monolith) with clear boundaries for later extraction. **Do not create one giant unstructured backend.**

---

## Architecture Diagrams

### Logical components

```
apps/ui (SPA)
  ├── Auth views (JWT access + refresh)
  ├── Dashboard shell + RGL canvas
  ├── Widget registry (core + plugins)
  ├── Admin (users, rooms/areas, devices, system)
  ├── Dark mode + responsive layouts
  └── Zustand stores (session, live, dashboards)

apps/api (Fastify modular monolith)
  ├── API Gateway (authz, rate limit, /api/v1)
  ├── Authentication Service
  ├── User Service
  ├── Device Service
  ├── Capability Service
  ├── Telemetry Service
  ├── Dashboard Service
  ├── Widget Service
  ├── Automation Service
  ├── History Service
  ├── Notification Service
  ├── Plugin Manager
  ├── Configuration Service
  ├── Driver Host (protocol → device → capability mapper)
  └── Plugin Host

packages/*
  ├── domain (types, capability schemas)
  ├── mqtt-client
  ├── influx-client
  ├── auth (JWT access + refresh)
  └── plugin-sdk
```

### Runtime (Docker Compose — target)

| Service | Port (typical) | Notes |
|---------|----------------|-------|
| `postgres` | 5432 | Keep |
| `influxdb` | 8086 | Keep |
| `mosquitto` | 1883 / 9001 | Keep |
| `nodered` | 1880 | Keep |
| `esphome` | 6052 | Keep |
| `api` | 4000 | **New** Fastify |
| `ui` | 8080 / via proxy | **New** SPA static |
| `web` (V2 Next) | 3000 | **Parallel until cutover** |

Reverse proxy (nginx/Caddy) may later unify `/` → UI and `/api` → Fastify.

---

## Domain Model

Core entities (conceptual):

| Entity | Description |
|--------|-------------|
| **User** | Account with role (admin / viewer minimum) |
| **Room** | Spatial grouping |
| **Device** | Physical or logical endpoint; owns capabilities |
| **Capability** | Typed facet of a device (sensor, switch, binary, …) |
| **Binding** | Maps capability ↔ protocol address (e.g. MQTT topic) |
| **Dashboard** | Named layout owned by a user |
| **DashboardSection** | Named region on a dashboard (e.g. Living Room); optional `roomId` |
| **WidgetInstance** | Placed widget with type, layout, binding, appearance JSON |
| **Driver** | Protocol adapter producing/consuming bindings |
| **Plugin** | Package registering widgets, drivers, and/or services |
| **AutomationMeta** | Optional Postgres record pointing at Node-RED flow identity |
| **Notification** | In-app / channelled alert (post-MVP depth) |

Relationships:

- Device **1—N** Capability  
- Capability **0—1** Binding (primary); extensions later  
- Dashboard **1—N** DashboardSection  
- DashboardSection **1—N** WidgetInstance  
- DashboardSection **0—1** Room (optional link; freeform sections allowed)  
- WidgetInstance **binds to** Capability (or multi-capability config)  
- Plugin **registers** WidgetTypes and/or Drivers  

### Dashboard document hierarchy

```
Dashboard
  └── Section[]     // one level only (e.g. Living Room, Kitchen)
        └── Widget[]
```

**Rules:**

- Do **not** nest sections inside sections in v1 of this model.
- Section title is freeform; `roomId` is optional for future room templates.
- `schemaVersion: 2` — migrate v1 flat `widgets[]` into a single section titled **Main**.
- Collapsible sections are a UI concern; persist `collapsed` on the section.

---

## Capability Model

Capabilities are the **single abstraction** the UI and automations reason about.

### Capability identity

```
capabilityId: string (UUID)
deviceId: string
kind: CapabilityKind   // e.g. temperature | humidity | switch | binary_sensor | number | enum | …
unit?: string
name: string
state: CapabilityState // typed value + quality + updatedAt
```

### Capability kinds (platform catalog — extensible)

| Kind | Value shape | Commands | V3.1.1 |
|------|-------------|----------|--------|
| `temperature` | number | none | Must |
| `humidity` | number | none | Must |
| `pressure` | number | none | Should |
| `battery` | number | none | Should |
| `voltage` / `current` / `power` / `energy` | number | none | Should / Could |
| `number` | number | optional set | Must |
| `switch` | boolean | on / off / toggle | Must |
| `brightness` | number | set | Could |
| `colour` | object | set | Future |
| `motion` / `door` | boolean | none | Should |
| `lock` | enum/boolean | lock/unlock | Future |
| `camera` | stream ref | none | Future |
| `alarm` | enum | arm/disarm | Future |
| `weather` | object | none | Could |
| `gps` | coordinates | none | Future |
| `binary_sensor` | boolean | none | Must |
| `enum` / `text` / `json` | varies | optional | Must (escape) |

**Rules:**

- UI must **not** special-case manufacturer or protocol.
- UI special-cases **capability kinds** + widget bindings only.
- Never hardcode “device types” as the primary model.

### State quality

`good | stale | unknown | error` — Telemetry Service sets quality from freshness and LWT.

---

## Device Model

```
Device {
  id, name, roomId?, enabled, driverId,
  metadata: { manufacturer?, model?, esphomeName?, ... },
  lastSeenAt?, online: boolean
}
```

Devices are **containers**. Capabilities are first-class. Renaming a relay updates capability display name — not a separate UI taxonomy of “relay widgets vs sensor cards” hardcoded to device tables.

**Migration note:** V2 `sensors` / `relays` tables map into capabilities of kinds `number`/`temperature`/… and `switch`.

---

## Driver Model

Drivers are layered so protocols and vendors stay out of the UI.

```
Device
  ↓
Protocol Driver          (MQTT, Matter, Zigbee, Modbus, BLE, …)
  ↓
Device Driver            (ESPHome, Shelly, Tuya, Generic MQTT, …)
  ↓
Capability Mapper        (protocol entities → capabilities + bindings)
  ↓
Telemetry Service
  ↓
API → Dashboard
```

```
Driver {
  id, name,
  protocol: 'mqtt' | 'matter' | 'zigbee' | 'modbus' | 'ble' | ...,
  discover(): DiscoveryResult[],
  syncBindings(deviceId): void,
  publishCommand(capabilityId, command): Promise<void>,
  health(): DriverHealth
}
```

### First-party (V3.1.1)

- **Generic MQTT** + **ESPHome** device driver (YAML suggest/import)  
- Subscribes → Capability Mapper → Telemetry cache  
- Commands → MQTT publish  

### Future (plugins / first-party later)

Shelly, Matter, Zigbee, Modbus, Tuya, Bluetooth — same internal capability model.

---

## Plugin Architecture

### Goals

- Extend without core PRs for every widget  
- Stable contracts versioned (`pluginApi: 1`)  
- Fail closed: bad plugin must not crash API process (isolate where practical)

### Plugin manifest (conceptual)

```json
{
  "id": "nexternel.example",
  "version": "1.0.0",
  "pluginApi": 1,
  "contributes": {
    "widgets": ["example.gauge"],
    "drivers": [],
    "services": []
  }
}
```

### Contribution points (first-class)

| Contribution | Runs in | Notes |
|--------------|---------|-------|
| Device drivers | API | Protocol/device/capability mapper |
| Widgets / charts | SPA (+ schema on API) | Catalog registration |
| Automation nodes | External / future | Prefer Node-RED; embed later |
| Integrations | API | Third-party APIs |
| API endpoints | API | Namespaced under plugin id |
| Navigation items | SPA | Admin/sidebar contributions |
| Reports / themes | SPA / API | |
| Notifications | API | Channels / templates |
| Database migrations | API/ops | Versioned, reviewed |
| Background services | API | Plugin Manager lifecycle |

### V3.1.1 scope

**Must:** Documented SDK + in-repo example plugin; registry wiring.  
**Should/Future:** Hot-load, sandbox, marketplace (see PRD).

---

## Backend Architecture

### Modular monolith (Fastify)

- One Node process, multiple Fastify plugins (`@fastify/…` + internal modules)  
- Shared domain package for types and Zod/TypeBox schemas  
- Explicit module boundaries; no circular imports across services  

### Extracted libraries (from V2)

Candidates to port into `packages/` (behaviour-preserving extract, then adapt):

| V2 source (approx.) | Package |
|---------------------|---------|
| `mqtt.ts` / device MQTT helpers | `@nexternel/mqtt-client` |
| Influx query helpers | `@nexternel/influx-client` |
| Auth crypto / JWT (`jose`) | `@nexternel/auth` |
| Dashboard JSON shapes | `@nexternel/domain` |

Do **not** copy Next route handlers wholesale — re-express as Fastify routes against domain services.

---

## Frontend Architecture

```
apps/ui/
  src/
    app/           # router, providers
    features/      # auth, dashboard, devices, admin, history
    widgets/       # core widget implementations (JSON-config driven)
    stores/        # Zustand
    api/           # REST + WS clients (refresh token handling)
    theme/         # MUI theme — light/dark
```

### Principles

- Feature folders over type-only folders for product code  
- Widgets receive **props from bindings + live store**; no direct fetch to Influx  
- React Grid Layout owns placement; widgets own internal layout within cell  
- **ECharts only** for charts/gauges/energy/stats/trends — no competing chart libraries  
- Professional UI: dark mode, responsive, desktop-first, tablet + mobile support  
- Do not port V2 gauge CSS absolute/% layout soup  

### Core widget examples (catalog)

Gauge, Chart, Switch, Button, Status, Camera, Weather, Image, Text, Floorplan, Energy, Alarm, Battery, MQTT Monitor — MoSCoW in PRD.

### State

| Store | Contents |
|-------|----------|
| `session` | user, access/refresh handling, role |
| `live` | capabilityId → state |
| `dashboards` | layouts, edit draft |
| `catalog` | widget types from core + plugins |

---

## API Gateway

For V3.1.1, Fastify **is** the API gateway:

- Terminates TLS only if deployed behind TLS terminator (recommended: reverse proxy)  
- Auth middleware on protected routes  
- Rate limits on `/auth/login`  
- CORS restricted to SPA origin  

Later: optional dedicated gateway if multi-service split occurs — not required for V3.1.1.

---

## Service Boundaries

| Service | Owns | Does not own |
|---------|------|--------------|
| **API Gateway** | `/api/v1` routing, auth middleware, rate limits, CORS | Business logic |
| **Authentication** | Login, **JWT access + refresh tokens**, revoke, `/me` | Dashboard JSON |
| **User** | Users, roles, profile | Device telemetry |
| **Device** | Devices, rooms/areas, enablement, metadata | Live values |
| **Capability** | Capability defs, kinds, bindings metadata | MQTT sockets |
| **Telemetry** | MQTT ingest, live cache, availability, heartbeat, stale detection, validation, derived metrics, events, WS broadcast, commands | Long-term Influx retention policy ownership |
| **Dashboard** | Dashboards CRUD, permissions, templates, import/export | Widget pixel rendering |
| **Widget** | Instance schemas, catalog registration | Drivers |
| **History** | Influx query API, bounds, series shaping | Live push |
| **Notification** | Alert rules / delivery (thin in 3.1.1) | Device CRUD |
| **Automation** | Metadata + Node-RED health/link | Flow execution engine |
| **Plugin Manager** | Discover/enable plugins, contribution registry | Arbitrary host FS without policy |
| **Configuration** | System settings, feature flags, secret refs | Time-series samples |

---

## Telemetry Service

Dedicated engine (in-process module first; extractable later).

| Responsibility | Behaviour |
|----------------|-----------|
| MQTT subscription | Via Protocol/Device drivers |
| Live state management | CapabilityId → state + quality |
| Caching latest values | In-memory; Redis later if scaled |
| Device availability | LWT / heartbeat / last-seen |
| Heartbeat monitoring | Configurable intervals |
| Stale detection | Mark `stale` when freshness exceeded |
| Data validation | Type/range checks before cache update |
| Derived metrics | Optional computed capabilities (e.g. power from V×I) |
| Event generation | Threshold / change events for Notification Service |
| WebSocket broadcasting | `capability.updated`, `device.presence` |
| Historical coordination | Node-RED remains primary Influx writer in V3.1.1; Telemetry does not become a second uncontrolled writer without ADR |

```
MQTT → Telemetry Service → Live State Cache
                              ├──► WebSocket → Dashboard
                              └──► events → Notification (later)
```

---

## Automation Service

- V3.1.1: **Node-RED remains the runtime**  
- API exposes health check / deep link  
- Optional Postgres metadata for “known automations” listing  
- Do not reimplement Node-RED inside Fastify  

---

## History Service

- Reads Influx only  
- Enforces max range / max points  
- Returns series shaped for ECharts  
- Measurement/tag conventions documented under MQTT/Influx standards  

---

## Notification Service

- V3.1.1: interface + optional in-app stub  
- V3.2: threshold rules + channels  

---

## Authentication Service

- Password hashing (argon2 or bcrypt — pick one in implementation ADR)  
- **JWT access token** (short-lived) + **refresh token** (rotated, revocable)  
- Delivery: HTTP-only cookies (preferred for same-site SPA) **or** Bearer — Phase 2 ADR  
- Roles: `admin`, `viewer` minimum; permissions model expands (dashboard/device ACLs — Should/Future)  
- All mutating routes require auth; viewers read-only  
- Audit failed logins and privileged actions  

## User Service

- CRUD users (admin)  
- Role assignment  
- Profile fields as needed  

## Device Service

- CRUD devices; room/area assignment; enable/disable  
- Does not store time-series  

## Capability Service

- Registry of capabilities per device  
- Binding metadata CRUD  
- Command authorization checks before Telemetry/Driver execute  

## Dashboard Service

- Unlimited dashboards per user  
- Permissions (owner/shared)  
- Templates; import/export JSON  
- Validates `schemaVersion`  

## Widget Service

- Widget instance validation  
- Catalog merge (core + plugins)  
- Does not talk to MQTT  

## Plugin Manager

- Load manifests; enable/disable  
- Register contributions into Capability/Widget/Driver registries  
- Enforce versioned `pluginApi`

---

## Configuration Service

- Source of truth for rooms, devices, capability definitions, dashboard documents  
- Validates widget JSON against schema version  
- Migrations for capability model from V2 tables  

---

## Dashboard Engine

- CRUD dashboards  
- Validate layout (`x,y,w,h`, widget type, bindings)  
- Document shape: **Dashboard → Section → Widget** (`schemaVersion: 2`)  
- Version field on document (`schemaVersion`) for forward migrations  
  - `1` → flat `widgets[]` (legacy)  
  - `2` → `sections[]` each with `widgets[]`  
- Edit draft vs published (optional; MVP may be single save)  

---

## Widget Engine

- Registry: `widgetTypeId → definition` (renderer component id, config schema, default size)  
- Binding resolution: capability ids → live values  
- Plugins register additional types  
- Core widgets for V3.1.1: switch, numeric/stat, gauge, history chart, system info, clock/weather if ported  

---

## REST API

Base path: `/api/v1`

| Area | Examples |
|------|----------|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Rooms | `GET/POST /rooms`, `PATCH/DELETE /rooms/:id` |
| Devices | `GET/POST /devices`, `PATCH /devices/:id` |
| Capabilities | `GET /devices/:id/capabilities`, `POST .../command` |
| Dashboards | `GET/POST /dashboards`, `PUT /dashboards/:id` |
| History | `GET /history?capabilityId=&from=&to=` |
| System | `GET /system/info` |
| Plugins | `GET /plugins` |

Errors: consistent `{ error: { code, message } }` with HTTP status.

---

## WebSocket API

Endpoint: `/api/v1/ws` (authenticated)

| Event | Direction | Payload |
|-------|-----------|---------|
| `capability.updated` | server → client | `{ capabilityId, state }` |
| `device.presence` | server → client | `{ deviceId, online }` |
| `subscribe` | client → server | `{ capabilityIds: [] }` |
| `ping/pong` | both | keepalive |

Clients must not assume MQTT topic knowledge.

---

## API Versioning

- URL prefix `/api/v1`  
- Breaking changes → `/api/v2`  
- Additive fields allowed in v1 with schemaVersion on documents  

---

## Database Design

### PostgreSQL Design

**Keep evolving existing DB**; add capability-centric tables rather than big-bang rename on day one.

Target tables (logical):

| Table | Purpose |
|-------|---------|
| `users` | Accounts |
| `rooms` | Rooms |
| `devices` | Devices |
| `capabilities` | Capability metadata + kind |
| `capability_bindings` | MQTT topic / command topic / parse hints |
| `dashboards` | Dashboard documents (JSONB layout) |
| `automation_meta` | Optional |
| `plugins` | Enabled plugins |
| `schema_migrations` | Version tracking |

**Invariants:**

- No time-series samples in Postgres  
- Widget layouts only in Postgres JSONB with `schemaVersion`  

V2 compatibility: migration scripts map `sensors`/`relays` → `capabilities` + bindings; dual-read period allowed (see Migration Plan).

### InfluxDB Design

- **Only** historical numeric (and agreed) readings  
- Tags: `device_id` / `capability_id` / `room_id` (as available)  
- Fields: `value` (float) or typed fields per measurement  
- Retention: site-configured; document defaults  
- Node-RED remains primary writer in V3.1.1; API is reader (writes only if explicitly designed later)  

---

## MQTT Standards

Document and enforce:

| Concern | Standard |
|---------|----------|
| Topic layout | Prefer ESPHome-compatible / existing site topics during migration |
| Commands | Documented command topic + payload (`ON`/`OFF` or JSON — per binding) |
| LWT / availability | Driver maps to device `online` |
| QoS | Document defaults (typically QoS 0/1 for sensors/commands) |
| Secrets | Broker credentials only in env / secrets files |

Backend is the sole product MQTT client for the SPA path.

---

## Security Architecture

| Control | Approach |
|---------|----------|
| Boundary | SPA → API only — **never** MQTT / Influx / Postgres from UI |
| AuthN | JWT **access + refresh** tokens |
| AuthZ | RBAC; expand to permissions |
| Secrets | Env / Docker secrets; never git |
| Encryption | TLS at reverse proxy; secrets encrypted at rest where hosted |
| Transport | TLS in production |
| Input | Schema validation (Zod/TypeBox) on all bodies |
| MQTT | Credentials server-side only |
| Supply chain | Lockfiles; prefer audited deps |
| Audit logging | Auth events + privileged device/admin actions |
| Plugins | Least privilege; trusted local plugins in V3.1.1 |

---

## Logging Strategy

- Structured JSON logs from API (`level`, `msg`, `requestId`, `userId?`)  
- No secrets or tokens in logs  
- Correlation id per HTTP/WS connection  
- SPA: error boundary + optional remote log endpoint later  

---

## Monitoring Strategy

- Health: `GET /api/v1/health` (postgres, influx, mqtt connectivity)  
- Metrics (Should): request latency, WS clients, MQTT reconnects  
- Node-RED / Mosquitto: existing ops practices + documented checks  

---

## Testing Strategy

| Layer | Focus |
|-------|-------|
| Unit | Domain parsers, capability command validation, layout schema |
| Integration | API + Postgres testcontainer; MQTT mock |
| Contract | OpenAPI/schema snapshots for `/api/v1` |
| E2E | Login → dashboard → toggle switch (Playwright) |
| Migration | V2 fixture DB → capability migration dry-run |

V2 Next UI: no new feature tests required; freeze except critical fixes.

---

## Deployment Strategy

- Docker Compose continues as primary install  
- New services: `api`, `ui`  
- V2 `web` remains until cutover  
- FileZilla / PuTTY workflow adapted in DEPLOY docs at implementation time  
- Images built on server or CI later  

---

## Disaster Recovery

| Asset | Backup |
|-------|--------|
| Postgres | `pg_dump` schedule |
| Influx | Documented backup / retention awareness |
| Node-RED flows | Volume backup |
| ESPHome YAML | Git / FileZilla copies |
| Secrets | Offline secure store (not in repo) |

Restore runbooks: Migration Plan + future ops runbook.

---

## Migration Strategy (architecture view)

1. Run V2 and V3 stacks in parallel  
2. Share Postgres/Influx/Mosquitto/Node-RED  
3. Introduce capability tables; dual-write or ETL from sensors/relays  
4. Cut SPA users to V3 when parity met  
5. Retire Next UI; optionally keep thin Next only if needed — prefer remove  

Detail: [05-IMPLEMENTATION-MIGRATION-PLAN.md](05-IMPLEMENTATION-MIGRATION-PLAN.md).

---

## Coding Standards

- TypeScript strict mode  
- No `any` without justification  
- ESLint + Prettier (repo standard to be set in Phase 1)  
- Conventional commits optional; CHANGELOG required for releases  
- All hooks before conditional returns (React)  
- Prefer pure functions for parsing/MQTT mapping  

---

## Folder Structure (target monorepo)

```
nexternel/
├── apps/
│   ├── api/                 # Fastify Backend API
│   ├── ui/                  # Vite React SPA
│   └── web/                 # V2 Next (legacy until retirement)
├── packages/
│   ├── domain/
│   ├── mqtt-client/
│   ├── influx-client/
│   ├── auth/
│   └── plugin-sdk/
├── plugins/
│   └── example-widget/
├── db/                      # Postgres init + migrations
├── mosquitto/
├── nodered/
├── esphome/
├── docs/
│   └── v3/                  # This bible
├── docker-compose.yml
└── scripts/
```

Names may be adjusted at Phase 1 kickoff; boundaries must remain.

---

## Dependency Rules

| From → To | Allowed? |
|-----------|----------|
| `apps/ui` → `apps/api` (HTTP only) | Yes (runtime) |
| `apps/ui` → MQTT/Influx/Postgres | **No** |
| `apps/ui` → `packages/domain` | Yes (types) |
| `apps/api` → `packages/*` | Yes |
| `apps/api` → `apps/ui` | **No** |
| `packages/*` → `apps/*` | **No** |
| Plugins → `plugin-sdk` + documented hosts | Yes |
| Plugins → deep Fastify internals | **No** |

---

## Future Scalability

- Extract Telemetry to separate process + Redis if WS fan-out grows  
- Read replicas for Postgres (unlikely needed early)  
- Horizontal API behind sticky sessions or shared live-state store  
- Multi-site federation = V4 concern  

---

## Open decisions (require approval stamp)

1. Cookie vs Bearer as default SPA auth  
2. Exact Postgres DDL for capabilities (additive vs replace V2 tables)  
3. Reverse proxy choice for unified URL  
4. Gauge widget implementation library (custom SVG vs ECharts gauge)

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-21 | Initial SAS draft for review — Nexternel V3.1.1 |
| 0.2 | 2026-07-21 | Aligned to Master Architecture Plan (services, Fastify eval, drivers, JWT refresh, telemetry) |

**Approval required before implementation.**
