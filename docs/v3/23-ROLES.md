# Nexternel V3 — Roles & permissions

| Field | Value |
|-------|--------|
| **Version** | V3.1.066 |
| **UI** | `/admin/roles` |

## Default Viewer

- May **view** dashboards, Live, System (own profile / appearance), Areas, Devices
- May **control relays** (toggle switches)
- May **not** edit/add/delete dashboards, areas, devices, users, or roles

## Edit role

Each role has checkboxes for:

| Group | Permissions |
|-------|-------------|
| Dashboards | View / Edit |
| Live | View Live / Control switches |
| System | View System / profile |
| Areas | View / Edit |
| Devices | View / Edit |
| Admin | Manage users / Manage roles |

Presets: **Full access**, **Viewer preset**.

System **Administrator** must keep Manage users + Manage roles. System roles cannot be deleted.
