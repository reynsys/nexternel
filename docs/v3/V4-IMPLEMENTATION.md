# Nexternel V4 — Implementation tracker

| Field | Value |
|-------|--------|
| **Status** | **Phase 14 complete** — legacy widget render retired |
| **Branch** | `v4.0.0-foundation` |
| **Philosophy** | Area scope → Panel presentation → Dashboard layout |

**Normative panel rules:** [25-PANEL-ARCHITECTURE-RULES.md](25-PANEL-ARCHITECTURE-RULES.md)

---

## Phase 7–13 (summary)

Decouple Systems/Panels, integration panels, profile consolidation, panels-only add path, plugin ecosystem — see CHANGELOG.

## Phase 14 — Legacy widget retirement

| Step | Artifact | Status |
|------|----------|--------|
| Auto-migrate on load | `prepareDashboardSections()` — legacy widgets → panels | Done |
| Render path | `WidgetRenderer` — panels + plugins only | Done |
| Editors | Section grid — panel + plugin editors only | Done |

Legacy switch/stat/relay/ECharts/general widget **code** remains for migration helpers only.

## Phase 15 — Next (optional)

Driver plugins, plugin hot-load/marketplace, extended panel polish — gated on product priority.

---

## Earlier phases (summary)

Phases 1–6: domain foundation, onboarding, panel registry, dashboard panels, charts/camera/weather/system integration — see git history / CHANGELOG.

---

## Normative docs

[07-DOMAIN-MODEL](07-DOMAIN-MODEL.md) · [08-SYSTEM-CATALOGUE](08-SYSTEM-CATALOGUE.md) · [09-VIEW-REGISTRY](09-VIEW-REGISTRY.md) · [25-PANEL-ARCHITECTURE-RULES](25-PANEL-ARCHITECTURE-RULES.md) · [24-V4-BIBLE-CONSISTENCY-REVIEW](24-V4-BIBLE-CONSISTENCY-REVIEW.md)
