# Nexternel V3.1.1 — Implementation & Migration Plan

| Field | Value |
|-------|--------|
| **Document** | Implementation & Migration Plan |
| **Product** | Nexternel |
| **From** | V2.1.207 |
| **To** | V3.1.1 |
| **Status** | Draft — pending review & approval |
| **Rule** | No production code until Master Plan + Vision, Competitive Analysis, PRD, SAS, and this plan are approved |
| **Related** | [Master Plan](00-MASTER-ARCHITECTURE-PLAN.md) · [Vision](01-VISION.md) · [PRD](03-PRD.md) · [SAS](04-SOFTWARE-ARCHITECTURE.md) |

---

## Executive Summary

This plan migrates Nexternel from a **Next.js monolith (UI + API)** to a **Fastify Backend API + React SPA**, while **keeping Mosquitto, Node-RED, InfluxDB, and PostgreSQL operational** throughout.

Strategy: **strangler fig** — run V3 beside V2, migrate module by module, cut over only after parity, then retire Next UI.

This document expands the Master Plan’s eight phases into engineering workstreams with risks, rollback, and validation.

**Non-goals:** writing production code now; deleting V2 features prematurely; replacing Node-RED or brokers.

---

## Master Plan Phase Mapping

| Master Phase | Focus | Engineering workstreams (this doc) |
|--------------|-------|-------------------------------------|
| **Phase 1** Architecture foundation | Scaffolds, packages, compose, contracts | Phase 0 (docs gate) + Phase 1 + Phase 2 extract |
| **Phase 2** Backend API | Gateway, auth, users, devices, config | Phases 3–4 (auth + config APIs) |
| **Phase 3** Telemetry Engine | Live cache, WS, commands | Phase 5 |
| **Phase 4** Device capability system | Capabilities, bindings, migration | Phase 4 (capability DDL; before/with telemetry) |
| **Phase 5** New React frontend | Shell, auth UI, nav, dark mode | Starts Phase 1 UI shell; deepens through 3–6 |
| **Phase 6** Dashboard engine | RGL, widgets, ECharts | Phase 6–7 |
| **Phase 7** Plugin SDK | Contracts + example plugin | Phase 8 (admin/plugins) |
| **Phase 8** Migration from V2 | Cutover + retire Next | Phases 9–10 |

**Ordering note:** Capability schema (Master Phase 4) should land **before or with** Telemetry (Master Phase 3) so live state keys are capability IDs.

---

## Guiding Constraints

1. Never delete working functionality until an equivalent replacement exists  
2. Never break MQTT, Node-RED, InfluxDB, or PostgreSQL during migration  
3. UI must not talk directly to MQTT / Influx / Postgres  
4. Prefer extract-and-adapt of V2 libs over blind rewrites  
5. Every phase has rollback and validation gates  

---

## Suggested Git Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` / current production line | V2.1.x stability; critical fixes only |
| `docs/v3-bible` | These planning documents (may merge early) |
| `v3/foundation` | Packages, compose stubs, empty api/ui scaffolds |
| `v3/api-*` | Feature branches off `v3/foundation` for API modules |
| `v3/ui-*` | SPA feature branches |
| `v3/migrate-capabilities` | DB capability migration |
| `v3/cutover` | Final proxy/cutover + Next retirement |

**Rules:**

- No force-push to production branch  
- Long-lived `v3/foundation`; short-lived feature branches  
- Tag releases: `v2.1.x` continues until cutover; first V3 tag `v3.1.1` only after acceptance  

---

## Suggested Milestones

| Milestone | Exit criteria |
|-----------|----------------|
| **M0 — Docs approved** | Master Plan + Vision, Competitive, PRD, SAS, this plan signed off |
| **M1 — Skeleton** | `apps/api` + `apps/ui` boot in Docker beside V2; health OK |
| **M2 — Auth + config read** | Login via API; rooms/devices readable |
| **M3 — Live path** | Capability state via WS; switch command works |
| **M4 — Dashboards** | RGL dashboards persist + reload |
| **M5 — History** | ECharts history via History API |
| **M6 — Admin parity** | Users, system info, Node-RED link |
| **M7 — Cutover** | Default URL serves V3; V2 optional |
| **M8 — Retirement** | Next UI removed; CHANGELOG V3.1.1 shipped |

---

## Phase 0 — Documentation Freeze & Approval

### Objectives

- Complete and approve the V3.1.1 Development Bible  
- Freeze non-critical V2 feature work  

### Deliverables

- `docs/v3/00`–`05` approved  
- ADR log started (Fastify confirmed, SPA auth cookie vs Bearer, etc.)  
- V2 change policy: critical fixes + security only  

### Dependencies

- Stakeholder review time  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Scope creep in docs | MoSCoW in PRD; defer Future items |
| Premature coding | Hard stop until approval |

### Rollback Strategy

- N/A (docs only); revert doc PRs if needed  

### Testing Requirements

- Editorial review checklist against Master Plan section lists  

### Validation Criteria

- [ ] Master Plan + all five bible documents present and cross-linked  
- [ ] Explicit written approval to start Master Phase 1 / engineering Phase 1  

### Estimated Complexity

**Low** (effort already spent; approval gate)

### Branch

`docs/v3-bible`

---

## Phase 1 — Repository Foundation & Contracts

> **Master Plan Phase 1 — Architecture foundation**

### Objectives

- Create monorepo scaffolds without cutting over traffic  
- Publish TypeScript domain contracts (capabilities, dashboard JSON schema)  
- Establish coding/lint baselines  

### Deliverables

- `apps/api` Fastify hello + `/api/v1/health`  
- `apps/ui` Vite React + MUI shell + React Router  
- `packages/domain` capability + dashboard schema stubs  
- `packages/plugin-sdk` interface stubs  
- Docker Compose services `api` + `ui` (V2 `web` untouched)  
- OpenAPI skeleton  

### Dependencies

- Phase 0 approval  
- Node/Docker availability on dev + server later  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Compose port conflicts | Bind api `:4000`, ui `:8080`; keep `:3000` for V2 |
| Over-building UI | Shell only — no dashboard rewrite yet |

### Rollback Strategy

- Remove new compose services; delete new apps folders; V2 unchanged  

### Testing Requirements

- Health endpoint returns 200 in compose  
- UI loads blank shell  

### Validation Criteria

- [ ] V2 dashboard still works on `:3000`  
- [ ] New services start cleanly  
- [ ] Dependency rules documented in SAS observed in folder layout  

### Estimated Complexity

**Medium**

### Branch

`v3/foundation`

---

## Phase 2 — Extract Shared Backend Libraries

### Objectives

- Lift reusable V2 logic into packages consumable by Fastify  
- Avoid rewriting MQTT/Influx/auth crypto from scratch  

### Deliverables

- `@nexternel/mqtt-client` (from V2 mqtt helpers)  
- `@nexternel/influx-client`  
- `@nexternel/auth` (hash + JWT utilities)  
- Unit tests for parsers / topic helpers  
- ADR: cookie vs Bearer  

### Dependencies

- Phase 1 scaffolds  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Hidden Next coupling in libs | Extract pure functions first; leave route-specific code behind |
| Behaviour drift | Golden tests against known MQTT payloads |

### Rollback Strategy

- Packages unused by V2; discard or keep inert — V2 paths unchanged  

### Testing Requirements

- Unit tests for MQTT payload parse / command format  
- Auth token round-trip tests  

### Validation Criteria

- [ ] Packages importable from `apps/api`  
- [ ] V2 still uses its own copies until Phase 3 dual-run (no forced V2 refactor)  

### Estimated Complexity

**Medium–High**

### Branch

`v3/extract-libs`

---

## Phase 3 — Authentication Service on Fastify

### Objectives

- API-issued authentication for SPA  
- Read users from existing Postgres  

### Deliverables

- `POST /api/v1/auth/login|logout`, `GET /auth/me`  
- SPA login page wired to API  
- Role claim (`admin` / `viewer`)  

### Dependencies

- Phase 2 auth package  
- Existing `users` table  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Session incompatibility with V2 | Separate cookie names / paths; parallel auth OK |
| Password hash algorithm mismatch | Detect and support existing hash format |

### Rollback Strategy

- Disable SPA auth routes; continue using V2 login only  

### Testing Requirements

- Integration: login success/fail  
- Unauthorized access returns 401  

### Validation Criteria

- [ ] Admin can log into SPA  
- [ ] V2 login unaffected  

### Estimated Complexity

**Medium**

### Branch

`v3/api-auth`

---

## Phase 4 — Configuration: Rooms, Devices → Capabilities

### Objectives

- Introduce capability model in Postgres  
- Migrate or dual-map V2 sensors/relays  
- Expose Configuration APIs  

### Deliverables

- SQL migration: `capabilities`, `capability_bindings`  
- ETL or sync job from V2 sensor/relay rows  
- REST: rooms, devices, capabilities  
- Admin UI lists (read/write for admin)  

### Dependencies

- Phase 3 auth  
- SAS capability model approval  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data loss / mismatch | Dry-run migration; backup Postgres first |
| Dual-write complexity | Prefer read-migrate-verify; dual-write only if V2 still mutates entities |

### Rollback Strategy

- Keep V2 tables authoritative; drop or ignore new tables; restore from `pg_dump` if needed  

### Testing Requirements

- Migration on copy of production-like DB  
- Row counts / sample binding spot checks  

### Validation Criteria

- [ ] Every V2 sensor/relay has a capability mapping  
- [ ] V2 app still functions  
- [ ] API returns coherent capability list  

### Estimated Complexity

**High**

### Branch

`v3/migrate-capabilities`

---

## Phase 5 — Telemetry Service & Live Commands

### Objectives

- Replace SPA polling with WebSocket live state  
- Switch commands via API → MQTT  

### Deliverables

- Telemetry Service: MQTT subscribe → state cache → WS  
- `POST .../capabilities/:id/command`  
- SPA live store (Zustand)  
- Presence / LWT handling (basic)  

### Dependencies

- Phase 4 bindings  
- MQTT package  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Duplicate MQTT clients thrash broker | One API consumer group; document V2 still connected during parallel run |
| Command topic wrong | Compatibility tests per known device YAML |

### Rollback Strategy

- SPA falls back to disabled live; operators use V2 for control  

### Testing Requirements

- Integration with Mosquitto test broker  
- Toggle switch E2E on lab device  

### Validation Criteria

- [ ] State updates appear without manual refresh  
- [ ] Command flips physical/logical relay  
- [ ] Browser has no MQTT credentials  

### Estimated Complexity

**High**

### Branch

`v3/api-telemetry`

---

## Phase 6 — Dashboard Engine & Widget Engine (SPA)

### Objectives

- Unlimited dashboards with React Grid Layout  
- Persist widget JSON in Postgres via API  
- Core widgets bound to capabilities  

### Deliverables

- Dashboard CRUD API + schemaVersion  
- SPA edit/live modes  
- Core widgets: switch, stat/gauge, placeholder catalog  
- Import path from V2 dashboard JSON (best-effort mapper)  

### Dependencies

- Phases 3–5  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| V2 layout incompatibility | Mapper + manual re-layout acceptable for MVP |
| Gauge layout debt returns | New widgets; do not port CSS absolute soup |

### Rollback Strategy

- Users remain on V2 dashboards; V3 dashboard tables unused  

### Testing Requirements

- Save/reload layout  
- Drag/resize persistence  
- Binding to live capability  

### Validation Criteria

- [ ] Create dashboard → add widgets → reload → identical layout  
- [ ] Live values render in widgets  

### Estimated Complexity

**High**

### Branch

`v3/ui-dashboards`

---

## Phase 7 — History Service & Charts

### Objectives

- History API over Influx  
- ECharts widgets/pages  

### Deliverables

- `GET /api/v1/history` with range limits  
- History widget  
- Docs for measurement/tag conventions  

### Dependencies

- Influx package; Node-RED write path unchanged  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Query cost / huge ranges | Hard caps; defaults |
| Tag mismatch vs V2 | Compatibility layer reading legacy measurements |

### Rollback Strategy

- Hide history widgets; V2 charts remain  

### Testing Requirements

- Query known series; empty/error handling  

### Validation Criteria

- [ ] Chart matches V2 for same capability/window (approximate OK if documented)  

### Estimated Complexity

**Medium**

### Branch

`v3/api-history`

---

## Phase 8 — Administration, System, Automations Link, Plugins Contract

### Objectives

- Admin parity for MVP  
- Plugin contracts loadable for example widget  
- Node-RED link + system info  

### Deliverables

- User admin UI/API  
- System info (version, uptime, LAN/WAN if available)  
- Node-RED status/link  
- Example plugin registered in UI catalog  
- Activity log (Should — if timebox allows)  

### Dependencies

- Prior phases  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Plugin loading security | Load only trusted local plugins in 3.1.1 |

### Rollback Strategy

- Feature-flag admin sections; V2 admin remains  

### Testing Requirements

- Role checks (viewer cannot mutate)  
- Plugin appears in catalog  

### Validation Criteria

- [ ] PRD MVP acceptance checklist largely green  
- [ ] Plugin SDK example works without core edit  

### Estimated Complexity

**Medium**

### Branch

`v3/admin-plugins`

---

## Phase 9 — Parallel Run Hardening & Cutover

### Objectives

- Make V3 the default operator UI  
- Keep V2 available briefly for safety  

### Deliverables

- Reverse proxy or documented ports: default → UI+API  
- Cutover runbook  
- Performance pass (PRD goals)  
- Security review checklist  
- CHANGELOG + version `V3.1.1`  

### Dependencies

- Phases 1–8 validation  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Operator confusion | Clear URL docs; temporary “Legacy UI” link |
| Proxy misconfig | Staging cutover on lab host first |

### Rollback Strategy

- Point proxy back to V2 `:3000`; leave API running idle  

### Testing Requirements

- Full E2E journey suite on staging  
- Backup/restore drill  

### Validation Criteria

- [ ] Primary users complete daily tasks on V3  
- [ ] Rollback tested once  

### Estimated Complexity

**Medium**

### Branch

`v3/cutover`

---

## Phase 10 — Retire Next.js UI

### Objectives

- Remove obsolete frontend/API coupling  
- Leave foundations and V3 apps  

### Deliverables

- Remove or archive `apps/web` UI routes (and Next API once unused)  
- Compose without `web` service (or slim residual if any shared static — prefer none)  
- Update AGENTS.md / DEPLOY.md / INSTALL.md for V3  
- Final validation tag `v3.1.1`  

### Dependencies

- Successful Phase 9 soak (≥ agreed soak period, e.g. 1–2 weeks)  

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| Hidden dependency on Next route | Inventory all callers; grep before delete |

### Rollback Strategy

- Restore `apps/web` from git tag `v2.1.207` (or last V2 tag); re-enable compose service  

### Testing Requirements

- Smoke: auth, live, dashboard, history, admin  
- Confirm no process listens only for removed routes  

### Validation Criteria

- [ ] V3.1.1 acceptance criteria met  
- [ ] No browser path to MQTT/Influx/Postgres  
- [ ] Docs updated  

### Estimated Complexity

**Medium** (emotionally high; technically controlled)

### Branch

`v3/retire-next`

---

## Cross-Cutting: Data Migration Detail

```
V2 tables (sensors, relays, dashboard_layouts, …)
        │
        ▼
Migration scripts (db/migrations/3xx_*.sql + optional Node ETL)
        │
        ▼
capabilities + capability_bindings + dashboards (schemaVersion)
        │
        ▼
API serves capabilities; SPA binds widgets
```

**Backup before any production migration:**

```bash
# Ubuntu server (PuTTY) — example; adapt credentials from env
cd ~/damn-home && docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-pre-v3.sql
```

---

## Cross-Cutting: Testing Matrix

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| 1 | — | health | shell load |
| 2 | parsers | — | — |
| 3 | auth util | login API | SPA login |
| 4 | mappers | DB migration | device list |
| 5 | command validate | MQTT lab | toggle |
| 6 | layout schema | dashboard API | edit/save |
| 7 | query bounds | Influx | chart |
| 8 | RBAC | plugins | admin |
| 9–10 | — | full stack | acceptance |

---

## Complexity Summary

| Phase | Complexity |
|-------|------------|
| 0 Docs | Low |
| 1 Foundation | Medium |
| 2 Extract libs | Medium–High |
| 3 Auth | Medium |
| 4 Capabilities | High |
| 5 Telemetry | High |
| 6 Dashboards | High |
| 7 History | Medium |
| 8 Admin/plugins | Medium |
| 9 Cutover | Medium |
| 10 Retire Next | Medium |

---

## What “Done” Means for V3.1.1

See PRD Acceptance Criteria. Architecturally:

- Dedicated API owns MQTT/Influx/Postgres access  
- SPA uses REST + WS only  
- Capability model live  
- Dashboards on RGL persisted  
- V2 UI retired or explicitly deferred with approval (default: retired in Phase 10)  

---

## Hard Stop

**After approval of Master Plan + Documents 01–05, Master Phase 1 may begin only on explicit instruction.**

Until then: **no implementation code.**

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-21 | Initial migration plan — V2.1.207 → V3.1.1 |
| 0.2 | 2026-07-21 | Mapped to Master Architecture Plan phases 1–8 |

**Approval required before Phase 1 development.**
