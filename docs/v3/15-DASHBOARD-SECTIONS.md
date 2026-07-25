# Nexternel V3 — Dashboard sections

| Field | Value |
|-------|--------|
| **Version** | V3.1.051+ |
| **SAS** | [04-SOFTWARE-ARCHITECTURE.md](04-SOFTWARE-ARCHITECTURE.md) Domain Model |
| **Code** | [`packages/domain/src/dashboard.ts`](../../packages/domain/src/dashboard.ts) |

## Hierarchy

```
Dashboard → Section[] → Widget[]
```

One section level only. Optional `roomId` on a section (not required).

## Document (`schemaVersion: 2`)

```json
{
  "schemaVersion": 2,
  "name": "Home",
  "tabIcon": "home",
  "showTabLabel": true,
  "sections": [
    {
      "id": "section-living",
      "title": "Living Room",
      "order": 0,
      "collapsed": false,
      "icon": "sofa",
      "colSpan": 6,
      "roomId": null,
      "widgets": []
    }
  ]
}
```

### Section layout (V3.1.051)

Sections sit on a **12-column CSS grid** (not nested RGL):

| `colSpan` | Width |
|-----------|--------|
| 12 | Full row (default) |
| 6 | Half |
| 4 | Third |
| 3 | Quarter |

Flow is left→right, wrapping. Below the `md` breakpoint every section forces span 12 (stacked). Foldable accordion + widget count unchanged. `icon` is a catalog id from the UI dashboard icon set.

### Dashboard tab chrome

`tabIcon` / `showTabLabel` control the top [Dashboard tabs](22-DASHBOARD-TABS.md) bar. Edited on **Manage dashboards**.

## Migration

Stored `schemaVersion: 1` documents with top-level `widgets` are normalized on read/save into one section **Main**. Missing `colSpan` → 12; missing icons get defaults.

Helpers: `@nexternel/domain` → `migrateDashboardDocument`, `emptyDashboardDocument`; UI → `normalizeDocument` in `apps/ui/src/lib/dashboard-document.ts`.
