# Nexternel V3 — Dashboard tabs

| Field | Value |
|-------|--------|
| **Version** | V3.1.055 |
| **UI** | [`DashboardTabBar.tsx`](../../apps/ui/src/components/DashboardTabBar.tsx) |
| **Manage** | [`DashboardsPage.tsx`](../../apps/ui/src/pages/DashboardsPage.tsx) |
| **Home** | [`HomeRedirect.tsx`](../../apps/ui/src/pages/HomeRedirect.tsx) |

## Purpose

Quick switch between dashboards (e.g. Living Room → Garden) without returning to a list — same idea as V2’s horizontal tab bar.

## Behaviour

1. After login, `/` opens the **default** dashboard. If none is marked default, the first dashboard is promoted to default automatically, then opened. If there are no dashboards, `/` goes to Manage.
2. Sidebar **Dashboards** also goes to `/` (same home redirect), not the Manage list.
3. On `/dashboards/:id`, a top **tab bar** lists all dashboards (icon + optional label).
4. The **gear** menu (top-right of the tab bar) has **Manage dashboards** and **Edit dashboard**. On Manage, use the **star** to set the default; rename / tab icon are there too.

## Data

Stored on the dashboard **document** (JSONB):

- `tabIcon` — catalog id (see `apps/ui/src/lib/dashboard-icons.ts`)
- `showTabLabel` — default `true`; when false, tab is icon-only with tooltip

List API DTO exposes `tabIcon` / `showTabLabel` for the tab bar without requiring clients to dig into nested fields only.

## Related

- Sections / colSpan: [15-DASHBOARD-SECTIONS.md](15-DASHBOARD-SECTIONS.md)
