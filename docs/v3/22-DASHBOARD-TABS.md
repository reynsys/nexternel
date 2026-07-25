# Nexternel V3 — Dashboard tabs

| Field | Value |
|-------|--------|
| **Version** | V3.1.052 |
| **UI** | [`DashboardTabBar.tsx`](../../apps/ui/src/components/DashboardTabBar.tsx) |
| **Manage** | [`DashboardsPage.tsx`](../../apps/ui/src/pages/DashboardsPage.tsx) |
| **Home** | [`HomeRedirect.tsx`](../../apps/ui/src/pages/HomeRedirect.tsx) |

## Purpose

Quick switch between dashboards (e.g. Living Room → Garden) without returning to a list — same idea as V2’s horizontal tab bar.

## Behaviour

1. After login, `/` opens the **default** dashboard (or the first if none is marked default). If there are no dashboards, `/` goes to Manage.
2. On `/dashboards/:id`, a top **tab bar** lists all dashboards (icon + optional label).
3. The **gear** menu (top-right of the tab bar) has **Manage dashboards** and **Edit dashboard**. Rename / tab icon / default are on Manage.
4. Sidebar **Dashboards** still opens Manage; viewing a dashboard also highlights that nav item.

## Data

Stored on the dashboard **document** (JSONB):

- `tabIcon` — catalog id (see `apps/ui/src/lib/dashboard-icons.ts`)
- `showTabLabel` — default `true`; when false, tab is icon-only with tooltip

List API DTO exposes `tabIcon` / `showTabLabel` for the tab bar without requiring clients to dig into nested fields only.

## Related

- Sections / colSpan: [15-DASHBOARD-SECTIONS.md](15-DASHBOARD-SECTIONS.md)
