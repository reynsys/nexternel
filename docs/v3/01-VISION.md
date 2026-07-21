# Nexternel V3.1.1 — Vision

| Field | Value |
|-------|--------|
| **Document** | Vision |
| **Product** | Nexternel |
| **Version** | V3.1.1 |
| **Status** | Draft — pending review & approval |
| **Baseline** | V2.1.207 |
| **Related** | [Master Plan](00-MASTER-ARCHITECTURE-PLAN.md) · Competitive Analysis, PRD, SAS, Migration Plan |
| **Audience** | Product, engineering, partners, future contributors |
| **Classification** | Internal planning — commercial reference |

---

## Executive Summary

Nexternel is a self-hosted smart-home automation platform. It exists so households and small commercial sites can own their infrastructure, understand their devices, and automate with confidence — without surrendering control to a cloud vendor or drowning in accidental complexity.

Generation 3 is a deliberate reset of everything above the proven foundations. Mosquitto, Node-RED, InfluxDB, and PostgreSQL remain. The admin UI, dashboard engine, and API surface are redesigned for clarity, extensibility, and commercial quality.

This Vision document defines **why** Nexternel exists and the principles that govern every future decision. It does not prescribe implementation.

---

## Mission Statement

**Give people a smart home they fully own — observable, extensible, and calm to operate.**

Nexternel turns sensors, switches, and automations into a coherent system that is private by default, understandable by design, and open to plugins without forking the core.

---

## Vision Statement

By the end of the Generation 3 era, Nexternel is the self-hosted platform people choose when they want:

- **Capability-first devices** instead of hardcoded device “types”
- **Dashboards that stay maintainable** as the home grows
- **Automations that remain trustworthy** under change
- **A plugin economy** that extends the platform without rewriting it
- **Documentation and architecture** worthy of commercial software

Nexternel should feel like a product, not a science project that escaped the lab.

---

## Core Values

| Value | Meaning |
|-------|---------|
| **Ownership** | User data and control stay on infrastructure they run |
| **Clarity** | Complexity is surfaced honestly; magic is avoided |
| **Craft** | Prefer durable design over clever shortcuts |
| **Extensibility** | New capability arrives as plugins, not core forks |
| **Respect** | Respect user time, developer time, and operational load |
| **Honesty** | Status, failures, and limits are visible |

---

## Core Principles

1. **Foundations stay; surfaces evolve.** Never casually replace MQTT, Node-RED, InfluxDB, or PostgreSQL.
2. **The UI never talks to MQTT, Influx, or Postgres directly.** Everything goes through the Backend API.
3. **Devices expose capabilities**, not hardcoded product kinds.
4. **Dashboards are user-owned JSON layouts** — unlimited, draggable, resizable.
5. **History and config never mix stores.** Influx = time series; Postgres = everything else.
6. **Plugins extend; they do not invade.** Core remains stable; features arrive as modules.
7. **No placeholder architecture.** Specs precede code; code matches specs.
8. **Do not delete working behaviour** until an equivalent replacement exists.
9. **Prefer composition** over inheritance and monolith UI switches.
10. **Commercial quality** is the bar: docs, tests, security, and operability are first-class.

---

## Product Philosophy

Nexternel is a **control plane for the home**, not a gadget gallery.

- Optimise for **long-lived installations**, not demos.
- Prefer **few powerful models** (capability, dashboard, automation, plugin) over many one-off features.
- Ship **incremental migration** from V2 so homes stay online.
- Treat **admin and live dashboard** as first-class products, not afterthoughts.

---

## User Experience Philosophy

- **Calm by default.** The live dashboard should feel stable and readable at a glance.
- **Progressive disclosure.** Installers see depth; casual users see simplicity.
- **Feedback is immediate.** Actions confirm; failures explain.
- **Layouts belong to the user.** The platform assists; it does not trap.
- **Accessibility is not optional.** Contrast, keyboard, and semantics matter.
- **No layout roulette.** Widgets and grids are constrained and predictable.

---

## Developer Experience Philosophy

- **One obvious place** for each concern (API, domain, UI, plugin).
- **TypeScript end-to-end** with explicit contracts.
- **Small files, clear folders, documented APIs.**
- **Fast local loops** for UI and API without rebuilding the world.
- **Plugins have a published contract** and examples, not tribal knowledge.
- **Tests protect invariants**; migrations are reversible where possible.

---

## Plugin Philosophy

Plugins are how Nexternel grows without rotting.

- Plugins may add: devices/drivers, widgets, integrations, automation nodes, services.
- Plugins **must not** require editing platform core for normal extension.
- Plugin APIs are **versioned**; breaking changes are rare and announced.
- Security boundaries: plugins do not get unconstrained host privileges by default.
- The marketplace (future) is curated for quality, not volume vanity.

---

## Security Philosophy

- **Private by default** on the LAN; expose deliberately.
- **Least privilege** for users, services, and plugins.
- **Secrets never commit**; rotation is documented.
- **Auth is API-centric**; the SPA does not hold database credentials.
- **Audit what matters** (auth, device control, admin changes).
- Assume the UI is hostile until proven otherwise — validate everything server-side.

---

## Performance Philosophy

- Measure before optimising; optimise bottlenecks that users feel.
- Prefer **push (WebSocket)** for live state over aggressive polling.
- Keep dashboards **smooth under dozens of widgets**, not just three demos.
- History queries are bounded; unbounded scans are design bugs.
- Frontend bundles stay lean; charts and grids load with intent.

---

## Architecture Philosophy

- **Clean Architecture / SOLID** where they reduce coupling — not as ceremony.
- **High cohesion, low coupling** between services and UI modules.
- **Capability model** is the spine of devices and widgets.
- **Backend API is the façade** over Mosquitto, Node-RED metadata, Influx, and Postgres.
- Diagrams and ADRs are living artefacts, not wiki archaeology.
- Generation 3 prefers **replace-with-clarity** over endless patching of Generation 2 UI debt.

---

## Community Philosophy

- Documentation is part of the product.
- Contributions follow the architecture bible; drive-by rewrites are rejected.
- Be welcoming to installers and developers; gate quality, not people.
- Credit openly; secure carefully.

---

## Future Innovation Philosophy

- Innovate at the **edges** (plugins, UX, analytics) while keeping the **core boring**.
- Explore AI and advanced analytics only when they rest on clean telemetry and permissions.
- Camera, voice, and energy features arrive as capability plugins when ready — not bolted hacks.
- Stay curious about standards (Matter, etc.) without betting the core on unfinished ecosystems.

---

## Design Language

- **Functional modern:** clear hierarchy, restrained colour, purposeful motion.
- Prefer **information density with breathing room** over sparse marketing layouts on the live dashboard.
- Material Design as the V3.1.1 UI system (Material UI) — consistent components, accessible defaults.
- Charts (ECharts) and grids (React Grid Layout) are first-class visual citizens, not afterthoughts.
- Avoid decorative noise: no gratuitous glow, no unexplained animation.

---

## Brand Identity

| Element | Direction |
|---------|-----------|
| **Name** | Nexternel |
| **Generation** | 3 |
| **Versioning** | `V{generation}.{hardware}.{software}` — V3.1.1 starts the Generation 3 product line |
| **Tone** | Confident, precise, calm, technical without arrogance |
| **Promise** | Own your home automation — clearly |

Brand is expressed through consistency of product behaviour more than logos.

---

## Target Audience

1. **Self-hosting homeowners** who want privacy and control  
2. **Technical installers / integrators** deploying ESPHome + MQTT stacks  
3. **Power users** who build complex dashboards and automations  
4. **Small commercial sites** (offices, workshops) needing local reliability  
5. **Plugin developers** extending the platform  

---

## Long-term Objectives

- Become the reference self-hosted stack for MQTT/ESPHome-centric homes  
- Maintain a stable core with a thriving plugin surface  
- Achieve commercial-grade docs, tests, and release discipline  
- Support multi-user permissions without cloud lock-in  
- Enable analytics and reporting without corrupting the history store  

---

## Success Criteria

Nexternel V3.1.1 succeeds when:

| Criterion | Signal |
|-----------|--------|
| **Architecture** | UI never reaches MQTT/Influx/Postgres directly |
| **Migration** | V2.1.207 sites can run while V3 is introduced alongside |
| **Capabilities** | New device kinds ship as capability sets, not UI hardcodes |
| **Dashboards** | Users create unlimited, persistent, draggable layouts |
| **DX** | A new engineer can extend a widget via docs + plugin contract |
| **Ops** | Core services remain online through migration phases |
| **Quality** | Releases are documented, testable, and reversible where planned |

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-21 | Initial draft for review — Nexternel V3.1.1 |

**Approval required before implementation.**  
Related documents: [Master Architecture Plan](00-MASTER-ARCHITECTURE-PLAN.md), Competitive Analysis, PRD, Software Architecture Specification, Implementation & Migration Plan.
