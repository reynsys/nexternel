# Nexternel V3 — Dashboard tabs

| Field | Value |
|-------|--------|
| **Version** | V3.1.061 |
| **UI** | [`DashboardTabBar.tsx`](../../apps/ui/src/components/DashboardTabBar.tsx) |
| **Manage** | [`DashboardsPage.tsx`](../../apps/ui/src/pages/DashboardsPage.tsx) at `/manage/dashboards` |
| **Home** | [`HomeRedirect.tsx`](../../apps/ui/src/pages/HomeRedirect.tsx) for `/` and `/dashboards` |

## Purpose

Quick switch between dashboards (e.g. Living Room → Garden) without returning to a list — same idea as V2’s horizontal tab bar.

## Behaviour

1. **`/`** and **`/dashboards`** both hard-redirect to the **default** dashboard (`/dashboards/{id}`).
2. Top-right **gear** opens **Dashboard options** on the current dashboard (layout edit). **Manage dashboards** (create / default / icons) lives in an accordion inside that mode — not a separate choice menu.
3. Deep link `/manage/dashboards` still works; prefer the gear.
4. Sidebar **Dashboards** goes to `/` (home redirect).

## Data

Stored on the dashboard **document** (JSONB):

- `tabIcon` — catalog id (see `apps/ui/src/lib/dashboard-icons.ts`)
- `showTabLabel` — default `true`; when false, tab is icon-only with tooltip

List API DTO exposes `tabIcon` / `showTabLabel` for the tab bar.

## Related

- Sections / colSpan: [15-DASHBOARD-SECTIONS.md](15-DASHBOARD-SECTIONS.md)
