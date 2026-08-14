# Nexternel — Development Bible

Planning reference for Nexternel. **V3 shipped** (`:8080`). **V4** is the approved next generation.

## V4 foundation — read in order

| Step | Document | Path |
|------|----------|------|
| 1 | **Domain Model** | [07-DOMAIN-MODEL.md](07-DOMAIN-MODEL.md) |
| 2 | **System Catalogue** | [08-SYSTEM-CATALOGUE.md](08-SYSTEM-CATALOGUE.md) |
| 3 | **View Registry** | [09-VIEW-REGISTRY.md](09-VIEW-REGISTRY.md) |
| 4 | **Capability Standard** | [10-CAPABILITY-STANDARD.md](10-CAPABILITY-STANDARD.md) |
| 5 | Dashboard & View UX | [18-DASHBOARD-UX-ARCHITECTURE.md](18-DASHBOARD-UX-ARCHITECTURE.md) |
| 6 | UX & Design System | [06-USER-EXPERIENCE-AND-DESIGN-SYSTEM.md](06-USER-EXPERIENCE-AND-DESIGN-SYSTEM.md) |
| 7 | **V4 Consistency Review** | [24-V4-BIBLE-CONSISTENCY-REVIEW.md](24-V4-BIBLE-CONSISTENCY-REVIEW.md) |

**Gate:** **Frozen 04/08/2026** — implementation on branch `v4.0.0-foundation`. See [V4-IMPLEMENTATION.md](V4-IMPLEMENTATION.md).

---

## Core bible (00–05) — amended for V4

| # | Document | Path |
|---|----------|------|
| 0 | Master Architecture Plan | [00-MASTER-ARCHITECTURE-PLAN.md](00-MASTER-ARCHITECTURE-PLAN.md) |
| 1 | Vision | [01-VISION.md](01-VISION.md) |
| 2 | Competitive Analysis | [02-COMPETITIVE-ANALYSIS.md](02-COMPETITIVE-ANALYSIS.md) |
| 3 | PRD (+ **V4 Addendum**) | [03-PRD.md](03-PRD.md) |
| 4 | SAS (+ **V4 Addendum**) | [04-SOFTWARE-ARCHITECTURE.md](04-SOFTWARE-ARCHITECTURE.md) |
| 5 | Implementation & Migration Plan | [05-IMPLEMENTATION-MIGRATION-PLAN.md](05-IMPLEMENTATION-MIGRATION-PLAN.md) |

---

## V4 domain & UX (07–10, 18, 24)

| Document | Path |
|----------|------|
| UX & Design System | [06-USER-EXPERIENCE-AND-DESIGN-SYSTEM.md](06-USER-EXPERIENCE-AND-DESIGN-SYSTEM.md) |
| **Domain Model** | [07-DOMAIN-MODEL.md](07-DOMAIN-MODEL.md) |
| **System Catalogue** | [08-SYSTEM-CATALOGUE.md](08-SYSTEM-CATALOGUE.md) |
| **View Registry** | [09-VIEW-REGISTRY.md](09-VIEW-REGISTRY.md) |
| **Capability Standard** | [10-CAPABILITY-STANDARD.md](10-CAPABILITY-STANDARD.md) |
| Dashboard & View UX | [18-DASHBOARD-UX-ARCHITECTURE.md](18-DASHBOARD-UX-ARCHITECTURE.md) |
| V4 Consistency Review | [24-V4-BIBLE-CONSISTENCY-REVIEW.md](24-V4-BIBLE-CONSISTENCY-REVIEW.md) |

*Note: `08-SYSTEM-CATALOGUE` coexists with `08-PHASE3-4-TELEMETRY-CAPABILITIES` (V3 history). Same for `09`, `10` phase docs.*

---

## Phase notes (V3 implementation history)

| # | Document |
|---|----------|
| 6 | [06-PHASE1-FOUNDATION.md](06-PHASE1-FOUNDATION.md) |
| 7 | [07-PHASE2-BACKEND-API.md](07-PHASE2-BACKEND-API.md) |
| 8 | [08-PHASE3-4-TELEMETRY-CAPABILITIES.md](08-PHASE3-4-TELEMETRY-CAPABILITIES.md) |
| 9 | [09-PHASE5-6-DASHBOARDS.md](09-PHASE5-6-DASHBOARDS.md) — superseded for UX |
| 10–13 | [10-PHASE7-HISTORY.md](10-PHASE7-HISTORY.md) … [13-PHASE10-RETIRE-NEXT.md](13-PHASE10-RETIRE-NEXT.md) |

---

## Feature reference (V3 — see V4 mapping in 09, 24)

| # | Document | V4 note |
|---|----------|---------|
| 14 | [14-UI-SKINS.md](14-UI-SKINS.md) | Skins wrap Views |
| 15 | [15-DASHBOARD-SECTIONS.md](15-DASHBOARD-SECTIONS.md) | Area scope |
| 16 | [16-WIDGET-CATALOG.md](16-WIDGET-CATALOG.md) | **Superseded** |
| 17 | [17-ECHARTS-WIDGETS.md](17-ECHARTS-WIDGETS.md) | → Charts View |
| 18 | [18-AREAS.md](18-AREAS.md) | = Area |
| 19 | [19-DEVICES.md](19-DEVICES.md) | + System onboarding |
| 20–23 | Live switch, general widgets, tabs, roles | Partial supersede |

---

## Version lineage

| Generation | Status | Focus |
|------------|--------|--------|
| V2 | Retired | Next.js |
| V3 | Shipped | Capabilities, entity-first widgets |
| **V4** | **Approved · not implemented** | **Systems, Views, self-maintaining dashboards** |

Build: `V4.0.0` first release after freeze.

---

**Status (Aug 2026):** Domain model ✅ approved · Catalogues ✅ drafted · PRD/SAS ✅ amended · **Awaiting final sign-off & bible freeze** · **No implementation**
