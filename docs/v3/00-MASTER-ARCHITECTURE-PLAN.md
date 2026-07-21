# Nexternel V3.1.1 — Master Architecture Plan

| Field | Value |
|-------|--------|
| **Document** | Master Architecture Plan (governing charter) |
| **Product** | Nexternel |
| **From** | V2.1.207 |
| **To** | V3.1.1 |
| **Status** | Draft — pending review & approval |
| **Authority** | Chief Software Architect / Lead Engineering Manager |
| **Rule** | **No production code** until Vision, Competitive Analysis, PRD, SAS, and Migration Plan are approved |

This document is the **governing charter** for Generation 3. Sibling documents expand each area; where they conflict, **this Master Plan + approved ADRs** win until revised.

**Sibling bible:**

| # | Document |
|---|----------|
| 1 | [Vision](01-VISION.md) |
| 2 | [Competitive Analysis](02-COMPETITIVE-ANALYSIS.md) |
| 3 | [PRD](03-PRD.md) |
| 4 | [Software Architecture Specification](04-SOFTWARE-ARCHITECTURE.md) |
| 5 | [Implementation & Migration Plan](05-IMPLEMENTATION-MIGRATION-PLAN.md) |

---

## 1. Mandate

Nexternel V3.1.1 is not a patch of V2. It is a **controlled evolution**:

- **Keep** proven foundations (Mosquitto, Node-RED, InfluxDB, PostgreSQL, Docker, Node.js).
- **Replace** the Next.js admin/dashboard/frontend stack and its coupled API surface.
- **Build** a modular, scalable, secure, extensible, commercial-quality Smart Home Automation Platform that can become a **superior alternative** to platforms such as Home Assistant — **not a clone**.

Roles in every decision: product architect, systems engineer, security engineer, senior full-stack developer.

---

## 2. Architectural Review — Current State (V2.1.207)

*Read-only review. No production code modified for this document.*

### 2.1 Project structure

| Path | Role | V3 fate |
|------|------|---------|
| `apps/web/` | Next.js 16 UI **and** all HTTP APIs | Retire UI; extract reusable libs; replace API with Fastify |
| `db/` | PostgreSQL init + SQL migrations | Keep; evolve for capabilities |
| `docker-compose.yml` | Full stack | Keep; add `api` + `ui` |
| `mosquitto/` | Broker config | Keep |
| `nodered/` | Automation + MQTT→Influx | Keep |
| `esphome/` | Device YAML | Keep |
| `scripts/` | Ops helpers | Keep; adapt |
| `docs/v3/` | Generation 3 bible | Source of truth |
| `Template/` | Local reference (gitignored) | Ignore |

### 2.2 Applications & services (Docker)

| Service | Port | Responsibility |
|---------|------|----------------|
| postgres | 5432 | Users, rooms, devices, sensors, relays, dashboards, automations metadata |
| influxdb | 8086 | Sensor history (time-series) |
| mosquitto | 1883 / 9001 | Live device bus |
| nodered | 1880 | Flows: MQTT → Influx; automations |
| web (Next) | 3000 | Dashboard + admin + **all REST APIs** |
| esphome | 6052 | Compile / flash |

### 2.3 Existing APIs

There is **no Express or Fastify process**. All HTTP is Next App Router under `apps/web/src/app/api/` (~38+ route handlers), including:

| Group | Purpose |
|-------|---------|
| `auth/` | login, logout, me (JWT cookie via `jose`) |
| `devices/` | CRUD, ESPHome import/sync/suggest, MQTT probe, activity |
| `rooms/`, `sensors/`, `relays/` | Entity CRUD; relay toggle via MQTT |
| `readings/` | Latest + history (Influx) |
| `dashboard/` | Layouts, widgets, reflow |
| `automations/` | Rules metadata in Postgres |
| `system/`, `weather/`, `version/` | Ops / utility |

### 2.4 Database models (PostgreSQL / Prisma)

Current models: `Room`, `Device`, `Sensor`, `Relay`, `Automation`, `User`, `DashboardLayout`, `DashboardWidget`.

**Limitation:** Sensors and relays are first-class tables — **not** a unified capability model. Widgets are opaque JSON tied to string widget types.

### 2.5 Authentication

- Custom JWT in HTTP-only cookie (`jose`), not NextAuth.
- Admin vs non-admin patterns exist; fine-grained RBAC is limited.
- No refresh-token pair as a first-class product pattern.

### 2.6 MQTT usage

- Server-side MQTT from Next for live sensors/relays and commands.
- Browser uses **HTTP polling** for live state (not first-class WebSocket product path).
- ESPHome devices publish to Mosquitto; topics configured per entity.

### 2.7 Node-RED integration

- Primary writer of history to InfluxDB.
- Automation runtime.
- Linked operationally; not a deep productized “automation service” inside the web app.

### 2.8 InfluxDB integration

- History only (correct separation intent).
- Next API reads for charts (`readings`).

### 2.9 PostgreSQL usage

- Config and metadata only (correct intent).
- Dashboard layouts/widgets as JSONB.
- Schema bootstrap historically split (Prisma + ensure-*-tables) — technical debt.

### 2.10 Reusable vs retire

**Reuse / extract:** MQTT helpers, Influx helpers, auth crypto, device–MQTT mapping ideas, ESPHome import concepts, domain names (room, device, user), Docker foundations.

**Retire:** Next.js pages/AppShell, DashboardView/GridEditor, WidgetContent switchyard, library/widget-platform UI, gauge CSS layout wars, Recharts + react-gauge-component paths, Next as long-term API host.

### 2.11 Technical debt (drivers for V3)

| Debt | Impact |
|------|--------|
| UI + API in one Next process | Cannot evolve UI without risking API |
| No capability model | Hardcoded device/widget kinds |
| JSONB without strong contracts | Studio/dashboard drift |
| Gauge dual paths + CSS absolute/% fights | Repeated layout regressions |
| Polling instead of push | Laggy live UX |
| Dual schema bootstrap | Two sources of truth |

### 2.12 Risks & migration considerations

| Risk | Approach |
|------|----------|
| Breaking live homes | Strangler: V3 beside V2; shared foundations |
| MQTT double-subscribe load | Document parallel clients; consolidate at cutover |
| Data model mismatch | Capability migration with backup + dry-run |
| Scope explosion vs HA | Capability-first MQTT/ESPHome excellence first; plugins later |

---

## 3. Target architecture (canonical)

```
Devices
   ↓
MQTT
   ↓
Mosquitto
   ↓
Node-RED / Automation          Backend Services (Fastify modular monolith)
   ↓                                    ↓
InfluxDB (history writes)      REST API + WebSocket API  (/api/v1 …)
                                       ↓
                               React Frontend (SPA)
```

**Hard rule:** Frontend **never** directly accesses MQTT, InfluxDB, or PostgreSQL.

---

## 4. Preserve vs replace

### Preserve (foundation)

- Mosquitto MQTT Broker  
- Node-RED Automation Engine  
- InfluxDB Time-Series Database  
- PostgreSQL System Database  
- Docker infrastructure  
- Node.js ecosystem  

### Replace (legacy)

- Next.js Admin Dashboard  
- Existing frontend architecture  
- Existing dashboard implementation  
- Existing widget system  
- Existing charts / gauges / navigation / frontend state management  

Preferred approach: **replacement with cleaner architecture**, not endless repair.

---

## 5. Backend framework decision

### Evaluation: Fastify vs Express

| Criterion | Fastify | Express |
|-----------|---------|---------|
| TypeScript support | Excellent (schema-first, type providers) | Good (manual) |
| Performance | Generally higher throughput / lower overhead | Adequate for LAN scale |
| Validation | First-class (TypeBox/Zod plugins) | Middleware add-ons |
| WebSockets | Strong plugin story for live telemetry | Possible; more DIY |
| Plugin model | Aligns with platform plugin mindset | Middleware ecosystem huge |
| Ecosystem | Mature enough for API servers | Largest |
| Debugging / DX | Clear encapsulation | Very familiar |
| AI / codegen support | Schema-driven routes help | Also well-known in training data |
| Long-term suitability for Nexternel | **Preferred** | Acceptable fallback |

### Recommendation

**Adopt Fastify** as the V3 Backend API runtime.

Express remains acceptable only if an approved ADR documents familiarity outweighing Fastify’s fit for validation, WebSockets, and modular plugins.

---

## 6. Logical service boundaries

Do **not** invent one giant unstructured backend. Initially services may run **in one Fastify process** (modular monolith) with boundaries that allow future separation.

| Service | Responsibility |
|---------|----------------|
| **API Gateway** | Routing, auth middleware, rate limits, versioning façade (`/api/v1`) |
| **Authentication Service** | Login, JWT access + refresh tokens, session revocation |
| **User Service** | Users, roles, profile |
| **Device Service** | Devices, rooms/areas, enablement, metadata |
| **Capability Service** | Capability registry, kinds, bindings metadata |
| **Telemetry Service** | MQTT ingest, live cache, availability, WS broadcast, commands |
| **Dashboard Service** | Dashboards CRUD, permissions, import/export |
| **Widget Service** | Widget instance schemas, catalog registration |
| **Automation Service** | Metadata + Node-RED health/link (runtime stays Node-RED) |
| **History Service** | Influx queries, bounds, series shaping |
| **Notification Service** | Alerts, channels (thin in 3.1.1) |
| **Plugin Manager** | Discover, enable, contribute widgets/drivers/services |
| **Configuration Service** | System settings, feature flags, secrets references |

---

## 7. Device capability model

**Never hardcode device types in the UI.** Devices expose **capabilities**. The UI renders from capabilities. The UI must not need manufacturer or protocol knowledge.

### Core capability kinds (extensible)

Temperature, Humidity, Pressure, Battery, Voltage, Current, Power, Energy, Switch, Brightness, Colour, Motion, Door, Lock, Camera, Alarm, Weather, GPS — plus generic `number`, `binary_sensor`, `enum`, `text`, `json` escape hatches.

See SAS for formal schemas; PRD for MoSCoW of which kinds ship in V3.1.1 vs later.

---

## 8. Device driver architecture

```
Device
  ↓
Protocol Driver        (MQTT, Matter, Zigbee, Modbus, …)
  ↓
Device Driver          (ESPHome, Shelly, Tuya, Generic MQTT, …)
  ↓
Capability Mapper      (protocol entities → capabilities)
  ↓
Telemetry Service
  ↓
API
  ↓
Dashboard / Widgets
```

**Future drivers (plugin or first-party):** ESPHome, Shelly, Matter, Zigbee, Modbus, Tuya, Generic MQTT, Bluetooth.

All drivers expose a **consistent internal model** (capabilities + bindings + commands).

---

## 9. Telemetry engine

```
MQTT
  ↓
Telemetry Service
  ↓
Live State Cache
  ├──► WebSocket → Dashboard
  └──► (via History path / Node-RED) → InfluxDB
```

**Responsibilities:** MQTT subscription; live state; caching latest values; device availability; heartbeat monitoring; stale detection; validation; derived metrics; event generation; WebSocket broadcasting; coordination with historical storage (Node-RED remains primary writer in V3.1.1 unless ADR changes).

---

## 10. Dashboard & widget system

### Dashboard engine

- Unlimited user dashboards  
- Drag and drop + resizable (React Grid Layout)  
- Multiple layouts; responsive; desktop-first with tablet/mobile support  
- Permissions; templates; import/export  

### Widget system

- Dynamic, **JSON-defined**, capability-bound  
- Independent of a single hardcoded frontend switchyard  
- Examples: Gauge, Chart, Switch, Button, Status, Camera, Weather, Image, Text, Floorplan, Energy, Alarm, Battery, MQTT Monitor  

**Visualisation:** Apache ECharts is the **primary** visualisation engine (charts, gauges, energy, statistics, trends). Avoid competing chart libraries.

---

## 11. Frontend architecture

**New SPA** (not Next repair):

- React + TypeScript  
- Material UI  
- Apache ECharts  
- React Grid Layout  
- Zustand  
- React Router  

**UX requirements:** Professional appearance; dark mode; responsive; desktop-first; tablet + mobile support; fast rendering; reusable components.

---

## 12. Database responsibilities

| Store | Owns |
|-------|------|
| **InfluxDB** | Historical time-series **only** |
| **PostgreSQL** | Users, roles, permissions, rooms/areas, devices, capabilities, drivers, dashboards, widgets, plugins, automations metadata, configuration |

---

## 13. Plugin SDK

First-class. Plugins may add: device drivers, widgets, charts, automation nodes, integrations, API endpoints, navigation items, reports, themes, notifications, database migrations, services.

**Core must not require modification** for normal extension.

---

## 14. Security (product bar)

- JWT authentication **with refresh tokens**  
- Role-based access + permissions model  
- Encryption in transit (TLS at edge)  
- Secrets management (env / secret store; never git)  
- Audit logging for auth and privileged actions  
- Secure APIs (validation, least privilege, no UI→DB/MQTT)  

---

## 15. Coding standards

**Always:** TypeScript; Clean Architecture intent; SOLID; domain separation; reusable components; small files; meaningful names; strong typing; testing; documentation.

**Avoid:** Duplicated logic; large files; hardcoded device types; direct DB/MQTT from UI.

---

## 16. Implementation phases (Master Plan)

*After documentation approval only.*

| Phase | Focus |
|-------|--------|
| **1** | Architecture foundation (scaffolds, packages, compose, contracts) |
| **2** | Backend API (gateway, auth, users, devices, config) |
| **3** | Telemetry Engine |
| **4** | Device capability system |
| **5** | New React frontend shell + auth + navigation |
| **6** | Dashboard engine + widgets |
| **7** | Plugin SDK |
| **8** | Migration from V2 (cutover + retire Next) |

Detailed objectives, risks, rollback, and validation: [05-IMPLEMENTATION-MIGRATION-PLAN.md](05-IMPLEMENTATION-MIGRATION-PLAN.md) (maps Master phases ↔ engineering workstreams).

---

## 17. Differentiation (one-line)

Nexternel wins by **capability-first modelling**, a **strict API boundary**, **maintainable dashboards**, and **plugin extensibility** on a **self-hosted MQTT/Node-RED/Influx/Postgres foundation** — commercial docs and migration discipline included. Full analysis: [02-COMPETITIVE-ANALYSIS.md](02-COMPETITIVE-ANALYSIS.md).

---

## 18. Final rule

Complete and approve:

1. Vision  
2. Competitive Analysis  
3. PRD  
4. SAS  
5. Migration Plan  

**Then** begin Phase 1. Until then: **STOP — no production code.**

The goal is Nexternel V3.1.1: modular, scalable, professional, secure, extensible, developer-friendly, user-friendly.

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-21 | Master Plan + V2 architectural review incorporated |

**Approval required before Phase 1 development.**
