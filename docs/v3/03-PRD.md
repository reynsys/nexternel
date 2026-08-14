# Nexternel V3.1.1 — Product Requirements Document (PRD)

| Field | Value |
|-------|--------|
| **Document** | Product Requirements Document |
| **Product** | **Nexternel** |
| **Version** | V3.1.1 |
| **Status** | Draft — pending review & approval |
| **Baseline** | V2.1.207 |
| **Related** | [Master Plan](00-MASTER-ARCHITECTURE-PLAN.md) · [Vision](01-VISION.md) · [SAS](04-SOFTWARE-ARCHITECTURE.md) |
| **Priority key** | Must / Should / Could / Future |

---

## Executive Summary

Nexternel V3.1.1 is the first Generation 3 product release. It replaces the Generation 2 Next.js admin/dashboard experience with a modern React application and a dedicated Backend API, while preserving Mosquitto, Node-RED, InfluxDB, and PostgreSQL.

V3.1.1 delivers: capability-based devices, multi-dashboard layouts with draggable/resizable widgets, REST + WebSocket live updates, administration for users/rooms/devices, history charts, and a plugin-ready architecture (core contracts in place; marketplace later).

---

## Product Objectives

1. Ship a **maintainable** control plane for self-hosted smart homes  
2. **Decouple** UI from MQTT/Influx/Postgres via Backend API  
3. Model devices as **capabilities**, not hardcoded types  
4. Provide **unlimited user dashboards** with JSON-persisted widgets  
5. Migrate from V2 **without cutting live homes offline**  
6. Establish **plugin contracts** for long-term extensibility  

---

## Target Users

Self-hosters, ESPHome/MQTT installers, power users, small commercial sites, and plugin developers (see personas).

---

## User Personas

### Installer Persona — “Alex”

- Deploys Ubuntu + Docker stacks for clients  
- Needs predictable install, backups, device onboarding  
- Cares about MQTT topic conventions and ESPHome YAML  

### Home User Persona — “Sam”

- Wants a calm live dashboard  
- Toggles lights, checks climate, glances at status  
- Rarely edits automations  

### Advanced / Power User Persona — “Riley”

- Builds multi-page dashboards; tunes history and density  
- Writes Node-RED flows; expects keyboard and exportability  
- Demands capability-level control and plugin widgets  

### Commercial User Persona — “Jordan”

- Small office/workshop  
- Needs multi-user access and auditability  
- Values uptime and clear permissions  

### Developer Persona — “Casey”

- Builds widgets/drivers/plugins  
- Needs typed APIs, examples, and stable contracts  
- Rejects core forks for trivial extensions  

---

## Core Features

Priority legend: **M** Must Have (V3.1.1) · **S** Should Have · **C** Could Have · **F** Future

### Dashboard System

| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-01 | Users create unlimited dashboards | M |
| DASH-02 | Widgets stored as versioned JSON in Postgres | M |
| DASH-03 | Drag and resize widgets (React Grid Layout) | M |
| DASH-04 | Live dashboard fills viewport calmly (no layout roulette) | M |
| DASH-05 | Edit mode with save / discard | M |
| DASH-06 | Multiple dashboards selectable (tabs or list) | M |
| DASH-07 | Responsive layouts (desktop-first; tablet usable) | M |
| DASH-08 | Per-dashboard permissions (owner/shared) | S |
| DASH-09 | Dashboard import/export JSON | S |
| DASH-10 | Dashboard templates gallery | C |
| DASH-11 | Collaborative editing | F |

### Widget System

| ID | Requirement | Priority |
|----|-------------|----------|
| WID-01 | JSON-defined widget instances bound to capabilities | M |
| WID-02 | Core: Switch, Stat/Status, Gauge (ECharts), History Chart | M |
| WID-03 | Core: Text, Button, System/Battery where applicable | S |
| WID-04 | Weather, Image, Energy | C |
| WID-05 | Camera, Floorplan, Alarm, MQTT Monitor | F |
| WID-06 | Widgets extensible via plugins without core edits | M |
| WID-07 | Single viz engine: Apache ECharts (no competing chart libs) | M |

### Device Management

| ID | Requirement | Priority |
|----|-------------|----------|
| DEV-01 | CRUD rooms / areas | M |
| DEV-02 | CRUD devices with metadata (name, room, enabled) | M |
| DEV-03 | Devices expose **capabilities** (not hardcoded device types) | M |
| DEV-04 | Map MQTT topics / ESPHome entities to capabilities | M |
| DEV-05 | Relay/switch command via API → MQTT | M |
| DEV-06 | Online / last-seen status | M |
| DEV-07 | Capability kinds: temperature, humidity, switch, number, binary_sensor | M |
| DEV-08 | Capability kinds: pressure, battery, motion, door, power metrics | S |
| DEV-09 | ESPHome YAML import / suggest | S |
| DEV-10 | Brightness / colour / lock / camera / alarm / GPS | C–F |
| DEV-11 | Matter / Zigbee / Shelly / Modbus / Tuya as drivers/plugins | F |

### Automation

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTO-01 | Node-RED remains automation runtime | M |
| AUTO-02 | Admin link / health status for Node-RED | M |
| AUTO-03 | Store automation metadata in Postgres | S |
| AUTO-04 | Simple rule UI that compiles to flows/nodes | C |
| AUTO-05 | Full visual flow editor embedded | F |

### Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| NOT-01 | In-app notification centre for system events | S |
| NOT-02 | Alert rules on capability thresholds | S |
| NOT-03 | Email / webhook channels | C |
| NOT-04 | Mobile push | F |

### Telemetry & Live State

| ID | Requirement | Priority |
|----|-------------|----------|
| TEL-01 | Dedicated Telemetry Service (live cache + WS) | M |
| TEL-02 | WebSocket stream of capability state changes | M |
| TEL-03 | REST snapshot endpoints for capabilities | M |
| TEL-04 | Frontend never opens MQTT directly (default) | M |
| TEL-05 | Availability, heartbeat, stale detection | M |
| TEL-06 | Data validation before cache update | M |
| TEL-07 | Derived metrics / event generation hooks | S |

### History / Analytics / Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| HIS-01 | InfluxDB stores historical sensor readings only | M |
| HIS-02 | History query API with bounded ranges | M |
| HIS-03 | ECharts history widgets | M |
| HIS-04 | Downsampling policies documented | S |
| AN-01 | Basic usage stats (devices online, events/day) | C |
| AN-02 | Energy reports / scheduled PDF/CSV | F |

### Plugin System

| ID | Requirement | Priority |
|----|-------------|----------|
| PLG-01 | Documented plugin contract (widgets, drivers, services, nav, themes, …) | M |
| PLG-02 | Load widgets from plugins without core edits | M |
| PLG-03 | Load device drivers/integrations via plugins | S |
| PLG-04 | Plugin API endpoints / migrations / notifications contributions | C–F |
| PLG-05 | Signed / sandboxed plugins; marketplace | F |

### Driver System

| ID | Requirement | Priority |
|----|-------------|----------|
| DRV-01 | Layered: Protocol → Device Driver → Capability Mapper | M |
| DRV-02 | MQTT/ESPHome driver in core or first-party plugin | M |
| DRV-03 | Driver health and discovery APIs | S |
| DRV-04 | Third-party protocol drivers (Matter, Zigbee, …) | F |

### Users, Permissions, Administration

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-01 | Login / logout with JWT access + refresh tokens | M |
| ADM-02 | User management (admin) | M |
| ADM-03 | Roles: admin vs viewer (minimum) | M |
| ADM-04 | System info (version, uptime, LAN/WAN, resources) | M |
| ADM-05 | Activity / audit log | S |
| ADM-06 | Fine-grained dashboard/device permissions | F |
| ADM-07 | Backup/restore guide + scripts | S |
| ADM-08 | Theme / branding admin; dark mode default support | M–C |

### Security

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-01 | API authentication for all mutating routes | M |
| SEC-02 | Password hashing; JWT access + refresh | M |
| SEC-03 | RBAC enforced server-side | M |
| SEC-04 | Secrets via env / secret store; never in git | M |
| SEC-05 | TLS at reverse proxy in production | M |
| SEC-06 | Rate limit login; audit privileged actions | S |
| SEC-07 | MFA | F |

### Mobile / Client Support

| ID | Requirement | Priority |
|----|-------------|----------|
| MOB-01 | Responsive SPA usable on tablet | M |
| MOB-02 | Usable mobile viewport for live dashboard + controls | S |
| MOB-03 | Native mobile apps | F |
| MOB-04 | Mobile push notifications | F |

---

## User Journeys

### Typical installation
Installer deploys Docker Compose → sets env secrets → creates admin → opens SPA → sees empty home → creates room.

### Adding a device
Admin adds device → assigns room → driver discovers/mapps capabilities → live values appear on WS → optional dashboard widgets.

### Creating a dashboard
User creates dashboard → adds widgets from catalog → binds to capabilities → drags/resizes → saves JSON layout.

### Creating an automation
User opens Node-RED (linked) → builds flow on MQTT topics → metadata optionally registered in Nexternel.

### Managing users
Admin creates viewer/admin → assigns role → viewer sees dashboards read-only.

### Viewing history
User opens history widget/page → selects capability + range → ECharts renders from History API.

### Receiving alerts
(S) Threshold rule fires → notification centre entry → optional webhook.

### Managing plugins
(S/M contracts) Admin enables plugin → new widgets/drivers appear in catalogs.

---

## User Stories (sample)

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As Sam, I see live climate on my dashboard without laggy refresh storms | M |
| US-02 | As Riley, I create a second dashboard for “guests” without cloning the server | M |
| US-03 | As Alex, I import ESPHome entities into capabilities in one guided flow | S |
| US-04 | As Jordan, I grant a staff viewer access without MQTT credentials | M |
| US-05 | As Casey, I add a widget plugin using the published SDK without a core PR | M |

---

## Acceptance Criteria (V3.1.1 MVP)

- [ ] SPA authenticates via Backend API using JWT access + refresh  
- [ ] No browser MQTT / Influx / Postgres credentials  
- [ ] Capability model live (sensors/relays mapped)  
- [ ] At least one dashboard with RGL widgets persisted and reloadable  
- [ ] Telemetry WS + switch command path works for MQTT devices  
- [ ] History chart for a numeric capability via Influx-backed API  
- [ ] ECharts is the only chart/gauge library in the new SPA  
- [ ] Plugin contract + example widget loadable without core edit  
- [ ] V2 stack remains runnable in parallel during migration  
- [ ] Master Plan + Vision/PRD/SAS/Migration docs approved  

---

## Accessibility Goals

| Goal | Priority |
|------|----------|
| Keyboard navigation for primary admin + dashboard edit | M |
| Sufficient contrast (MUI theme defaults + audit) | M |
| Visible focus states | M |
| Screen-reader labels on controls | S |
| WCAG 2.2 AA target for core flows | S |

---

## Performance Goals

| Goal | Priority |
|------|----------|
| Dashboard interactive &lt; 3s on LAN typical hardware | M |
| WS live update latency felt &lt; 500ms for switch feedback | M |
| History queries default max window enforced | M |
| 30+ widgets on one dashboard without UI freeze | S |

---

## Scalability Goals

| Goal | Priority |
|------|----------|
| 50 devices / 200 capabilities per site | M |
| 10 dashboards / 40 widgets each | S |
| Multi-site federation | F |

---

## Security Goals

See Security feature table. Plus: dependency scanning in CI (S); security review before public exposure (M).

---

## Release Goals

| Goal | Priority |
|------|----------|
| Semver V3.1.1 with CHANGELOG | M |
| Docker Compose install path documented | M |
| Rollback notes per migration phase | M |

---

## Future Features (summary)

Matter/Zigbee plugins, MFA, marketplace, energy analytics, collaborative dashboards, mobile apps, embedded flow editor.

---

## MVP Definition (V3.1.1)

**In:** Auth (JWT+refresh), rooms/devices/capabilities, MQTT/ESPHome driver path, Telemetry WS, dashboards + RGL widgets, ECharts history, admin system info, Node-RED link, plugin **contracts**, dark mode, tablet-responsive shell, parallel run with V2.

**Out:** Marketplace, MFA, Matter/Zigbee, native mobile apps, full rule builder UI, camera/floorplan widgets.

---

## Version Roadmap

| Version | Theme |
|---------|--------|
| **V3.1.1** | Foundation: API + SPA + capabilities + dashboards + history |
| **V3.2** | Plugins loadable; ESPHome UX polish; notifications; viewer ACLs |
| **V3.5** | Hardening: backup UX, monitoring, performance, template dashboards |
| **V4** | **Systems, Views, self-maintaining dashboards, capability standard** ([07–10](07-DOMAIN-MODEL.md)) |

---

---

## V4 Addendum (approved direction — supersedes widget requirements for new work)

| Field | Value |
|-------|--------|
| **Generation** | V4 |
| **Status** | Approved in direction · Implementation after bible freeze |
| **Authority** | [07-DOMAIN-MODEL.md](07-DOMAIN-MODEL.md) · [08-SYSTEM-CATALOGUE.md](08-SYSTEM-CATALOGUE.md) · [09-VIEW-REGISTRY.md](09-VIEW-REGISTRY.md) · [10-CAPABILITY-STANDARD.md](10-CAPABILITY-STANDARD.md) |

V3.1.1 requirements below remain **shipped** for V3. V4 **supersedes** dashboard/widget requirements (WID-*, DASH-*) for all new development.

### V4 product objectives (additions)

1. **Systems own capabilities** — hardware independence ([07-DOMAIN-MODEL.md](07-DOMAIN-MODEL.md))  
2. **Views replace widgets** — Function → Area → Appearance ([09-VIEW-REGISTRY.md](09-VIEW-REGISTRY.md))  
3. **Self-maintaining dashboards** — Area + System on device → Views update without edit  
4. **Universal capability language** — [10-CAPABILITY-STANDARD.md](10-CAPABILITY-STANDARD.md)  
5. **Automation consumes Systems** — Node-RED + integrations, not dashboard-owned logic  

### V4 dashboard requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-V4-01 | Dashboards store **Views** with `viewScope` (Area + System + Group) | M |
| DASH-V4-02 | Add View: Function (System) → Area → Appearance — no default capability picker | M |
| DASH-V4-03 | Sections bind **Area**; filter Add View and default View Scope | M |
| DASH-V4-04 | Drag/resize Views (RGL) — unchanged | M |
| DASH-V4-05 | New device with Area + System → matching Views auto-include capabilities | M |
| DASH-V4-06 | V3 widgets read-only until migrated | M |
| DASH-V4-07 | Server-side View Scope resolve for large sites | S |
| DASH-V4-08 | Optional **Service** subdivision within System | F (V4.1+) |

### V4 view requirements (replaces WID-*)

| ID | Requirement | Priority |
|----|-------------|----------|
| VIEW-01 | Core Views per [09-VIEW-REGISTRY.md](09-VIEW-REGISTRY.md) | M |
| VIEW-02 | View Scope + Appearance + Behaviour editor tabs | M |
| VIEW-03 | One View kind, many Appearances (not switch_icon variants) | M |
| VIEW-04 | Charts View — ECharts only | M |
| VIEW-05 | Plugin View registration | S |
| VIEW-06 | Advanced include/exclude capability IDs | S |

### V4 device / capability requirements (extends DEV-*)

| ID | Requirement | Priority |
|----|-------------|----------|
| DEV-V4-01 | Onboarding: assign **Area** + **System** per capability batch | M |
| DEV-V4-02 | `capabilities.system_id` required (V4) | M |
| DEV-V4-03 | Optional `group_id`, future `service_id` | S / F |
| DEV-V4-04 | Classification rules per [08-SYSTEM-CATALOGUE.md](08-SYSTEM-CATALOGUE.md) | M |
| DEV-V4-05 | Same capability kind + different System = different meaning | M |

### V4 automation & integration

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTO-V4-01 | Node-RED remains automation runtime | M |
| AUTO-V4-02 | Automations reference capabilities; System-scoped triggers (future) | S |
| INT-V4-01 | Integrations (weather, Octopus) feed Systems / automations | S |

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-21 | Initial draft for review — Nexternel V3.1.1 |

**Approval required before implementation.**
