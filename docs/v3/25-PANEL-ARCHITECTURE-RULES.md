# Nexternel V4 — Panel Architecture Rules

| Field | Value |
|-------|--------|
| **Document** | Panel Architecture Rules |
| **Product** | Nexternel |
| **Generation** | V4 |
| **Version** | V4.1.0 |
| **Status** | **Normative** — Phase 7 |
| **Related** | [Domain Model](07-DOMAIN-MODEL.md) · [System Catalogue](08-SYSTEM-CATALOGUE.md) · [Panel Registry](09-VIEW-REGISTRY.md) · [Dashboard UX](18-DASHBOARD-UX-ARCHITECTURE.md) |

---

## 1. Locked principles

> **Areas provide scope. Systems provide domain meaning. Devices provide capabilities. Panels provide reusable presentation. Dashboards arrange Panels.**

> **The user defines their home. Nexternel does not define the user's home for them.**

> **Catalogue existence must NOT automatically mean UI visibility.**

> **Adding an Area or System must never, by itself, require adding a new Panel type.**

| Layer | Question | Role |
|-------|----------|------|
| **Area** | WHERE? | User-created only — Kitchen, Garden, Garage if the user has them |
| **System** | WHAT DOMAIN? | Platform vocabulary — Lights, Water, Security (user label: **Lights** not Lighting) |
| **Device** | WHAT ENTITY? | Implements capabilities |
| **Capability** | WHAT DATA/ACTION? | switch, temperature, power, … |
| **Panel type** | HOW (template)? | Platform-defined — `panel.controls`, etc. |
| **Panel instance** | HOW HERE? | User-created on a dashboard |

**Controls** (`panel.controls`) is a **Panel** — not a System.

**Lights** (`lighting` system id) is a **System** — illumination domain. User-facing label is **Lights**.

---

## 2. Panel definition vs Panel instance

### Panel definition (registry)

Defines **what a Panel kind can present**:

- `supportedKinds` / `excludeKinds` — capability profile
- label, description, default size
- integration rules (cameras, weather, host metrics)

Must **not** require a System (`requiredSystemIds` is prohibited).

### Panel instance (dashboard JSON)

Defines **where and how narrowly** to present:

```json
{
  "type": "panel.controls",
  "config": {
    "panelScope": {
      "inheritSectionArea": true,
      "areaIds": [],
      "systemIds": ["security"],
      "groupIds": []
    },
    "appearance": { "layout": "card" }
  }
}
```

| `panelScope` field | Absent / empty meaning |
|--------------------|-------------------------|
| `areaIds` | No explicit Area restriction (section inheritance may still apply) |
| `systemIds` | No System restriction — all Systems in scope |
| `groupIds` | No Group restriction |
| `inheritSectionArea` | When true, section `roomId` is merged into Area scope at resolve time |

Area and System filters **combine** (AND). Explicit IDs narrow content.

---

## 2.1 Catalogue vs operator UI

| Internal | Operator UI |
|----------|-------------|
| Full `SYSTEM_CATALOG` (12+ rows, future tiers) | Only Systems with capabilities in the selected Area scope |
| Full `CORE_PANEL_REGISTRY` | Only `userSelectable` kinds in Add panel |
| `garden` system row (deprecated, FK compat) | **Never** shown in filters |
| `/troubleshoot/panel-preview` | Developer preview of all panel **types** — not main nav |

`GET /api/v1/v4/systems` returns systems **in scope** by default. Pass `?catalog=1` for the full catalogue (installer/tools only).

---

## 3. System → Panel prohibition

Systems **must not**:

- define a default Panel type
- require a Panel type
- appear in the Panel registry as mandatory pairings

The System Catalogue describes **domain meaning** (purpose, typical capability kinds, automation examples, classification guidance). Optional **“Suggested panels”** in documentation or Add Panel UX are **hints only** — never stored as domain dependencies.

---

## 4. Controls ≠ Lighting

| Concept | Layer |
|---------|-------|
| `panel.controls` | Presentation — switches, brightness, colour (command-capable) |
| `lighting` System | Domain — capabilities that serve **illumination** |

A pump switch may appear on **Controls** while belonging to the **Water** System. A garage door on **Controls** with **Security** or **Vehicles** System assignment.

Generic `switch` capabilities must **not** be silently classified as Lighting. Use context hints or leave `system_id` unassigned until the installer confirms.

---

## 5. New Panel reuse test

Before creating any Panel kind:

1. Can an existing Panel render the required capability kinds?
2. Can `panelScope.areaIds` provide location scope?
3. Can `panelScope.systemIds` provide domain scope?
4. Can `supportedKinds` / `excludeKinds` provide the subset?
5. Can `appearance` / `behaviour` on the instance provide the layout?
6. Is the **data source** genuinely different (integration API, stream, host metrics)?
7. Is **user interaction** fundamentally different?

If **1–5 are yes** → **do not create a new Panel.**

Only proceed when **6 or 7** represents a new presentation or integration capability.

---

## 6. Prohibited Panel patterns

Do **not** create Panels because an Area or System exists:

- `panel.kitchen`, `panel.garage`, `panel.bedroom`, `panel.garden`, …
- `panel.entertainment`, `panel.appliances`, `panel.network`, … (unless reuse test passes for a new integration)

Appearance differences (tiles, density, hero value, alert-first) belong on **Panel instance** configuration — not new Panel kinds.

---

## 7. Examples (same Panels, different Areas)

### Kitchen — Lighting + Appliances

- Section Area = Kitchen
- `panel.controls` — scoped to Kitchen (inherits section)
- `panel.status` — `systemIds: ["environment"]` for air quality
- No `panel.kitchen`

### Garage — Security + Energy

- Section Area = Garage
- `panel.controls` — `systemIds: ["security"]` for door/gate
- `panel.status` — `systemIds: ["energy"]` for power meter
- No `panel.garage`

### Outdoor Area — Water + Environment

- Section Area = outdoor Area
- `panel.controls` — irrigation valve, pump (Water System capabilities)
- `panel.status` — soil moisture, outdoor temperature
- `panel.charts` — history for selected sensors
- No Area-named composite Panel

---

## 8. Legacy domain panels (short-term)

`panel.climate`, `panel.water`, `panel.energy`, `panel.security`, `panel.environment` may remain temporarily for compatibility. They are **capability-profile presentations**, not System mandates. Prefer `panelScope.systemIds` on instances when narrowing to a domain. Medium-term direction: consolidate toward Controls, Status, Charts, Camera, Weather, System.

---

## 9. Migration principles

- Preserve user intent: when retiring a Panel kind, map to existing Panels + scope
- Do not rewrite dashboards silently without a migration plan
- Legacy `view.*` types continue to normalize to `panel.*` until dashboards are upgraded
- Domain panels with empty `systemIds` may receive profile hints on migration to preserve prior resolver behaviour

---

## 10. Phase gate

Phase 8 features must pass the reuse test. A System row in the catalogue does **not** imply Panel implementation work.
