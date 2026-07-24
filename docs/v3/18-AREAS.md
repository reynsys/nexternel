# Nexternel V3 — Areas

| Field | Value |
|-------|--------|
| **Version** | V3.1.044+ |
| **UI** | [`apps/ui/src/pages/admin/AreasPage.tsx`](../../apps/ui/src/pages/admin/AreasPage.tsx) |
| **API** | [`apps/api/src/routes/rooms.ts`](../../apps/api/src/routes/rooms.ts) |

## Purpose

**Areas** are locations for devices — indoor rooms, gardens, driveway, garage, outdoors, etc. The UI label is **Area**; the PostgreSQL table remains `rooms` for compatibility.

## Routes

| UI | API |
|----|-----|
| `/admin/areas` | `GET/POST /api/v1/rooms` |
| `/admin/rooms` → redirect | `PATCH/DELETE /api/v1/rooms/:id` |

Mutations require **admin**. Deleting an area sets `devices.room_id` to `NULL` (`ON DELETE SET NULL`).

## Labels

Shared copy: [`apps/ui/src/lib/area-labels.ts`](../../apps/ui/src/lib/area-labels.ts).
