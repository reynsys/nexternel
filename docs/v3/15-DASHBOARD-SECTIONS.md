# Nexternel V3 — Dashboard sections

| Field | Value |
|-------|--------|
| **Version** | V3.1.028+ |
| **SAS** | [04-SOFTWARE-ARCHITECTURE.md](04-SOFTWARE-ARCHITECTURE.md) Domain Model |

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
  "sections": [
    {
      "id": "section-living",
      "title": "Living Room",
      "order": 0,
      "collapsed": false,
      "roomId": null,
      "widgets": []
    }
  ]
}
```

## Migration

Stored `schemaVersion: 1` documents with top-level `widgets` are normalized on read/save into one section **Main**.

Helpers: `@nexternel/domain` → `migrateDashboardDocument`, `emptyDashboardDocument`.
