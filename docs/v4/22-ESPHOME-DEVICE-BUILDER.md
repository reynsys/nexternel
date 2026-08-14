# ESPHome Device Builder — Phase 1

| Field | Value |
|-------|--------|
| **Version** | V4.0.090+ |
| **API** | `apps/api/src/esphome/builder/` |
| **Domain** | `packages/domain/src/esphome-builder.ts` |

## Purpose

Replace the fragmented YAML/FileZilla/ESPHome UI/import/sync workflow with a **Nexternel-managed** device path. Phase 1 delivers the foundation API; **Phase 2** adds the Admin wizard UI.

## Phase 2 UI (V4.0.088+)

**Admin → Devices → Add device** opens `EsphomeAddDeviceWizard`:

| Path | Steps |
|------|--------|
| **New ESPHome device** | Platform/board → name/area → components (DHT, relay) → review → create (`builder/create`) |
| **Import existing configuration** | Pick unregistered server YAML → area → register (`onboard/esphome`) |

Unregistered YAML cards on the Devices page open the wizard in import mode. Edit device remains a separate dialog.

**UI:** `apps/ui/src/pages/admin/EsphomeAddDeviceWizard.tsx`

## Phase 3 — Compile firmware (V4.0.090+)

From **Devices** → expand an ESPHome device → **Compile firmware**:

1. API runs `docker exec nexternel-esphome esphome compile /config/<yaml>` (requires API `docker.sock` mount).
2. Lifecycle updates: `building` → `firmware_ready` or `error`.
3. Build log shown in a dialog; then install via **Open ESPHome** (USB or OTA).

| Method | Path |
|--------|------|
| POST | `/api/v1/v4/devices/esphome/:deviceId/compile` |
| GET | `/api/v1/v4/devices/esphome/:deviceId/yaml` |

Device list includes `esphomeLifecycleState`, `esphomeManagementMode`, `esphomeYamlPath`.

## Phase 4 — Install OTA + Advanced YAML (V4.0.092+)

**Devices** → expand ESPHome device → **ESPHome** button opens a panel:

| Tab | Actions |
|-----|---------|
| **Firmware** | Compile firmware · Install OTA (runs `esphome upload` in container) |
| **Advanced** | View/edit YAML · Validate · Save (sets `advanced` mode; syncs sensors/relays from YAML) |

| Method | Path |
|--------|------|
| POST | `/api/v1/v4/devices/esphome/:deviceId/upload` |
| PUT | `/api/v1/v4/devices/esphome/:deviceId/yaml` |
| POST | `/api/v1/v4/devices/esphome/:deviceId/yaml/validate` |

First-time USB flash may still require ESPHome dashboard if the device has never been on the network.

## Source of truth

| Mode | Authority | Notes |
|------|-----------|--------|
| **Managed** (`esphome_management_mode = managed`) | `esphome_builder_config` JSON → generated YAML | Created via Device Builder API |
| **Imported** (`imported`) | Existing server YAML → import/sync | Legacy + migration path |
| **Advanced** (`advanced`) | YAML after manual Advanced edit | UI must warn when builder cannot round-trip |

## Phase 1 API

| Method | Path | Role |
|--------|------|------|
| GET | `/api/v1/v4/devices/esphome/builder/catalog` | Boards + component catalogue |
| POST | `/api/v1/v4/devices/esphome/builder/validate` | User-friendly validation |
| POST | `/api/v1/v4/devices/esphome/builder/preview` | YAML + capability preview |
| POST | `/api/v1/v4/devices/esphome/builder/create` | Write YAML, create device + capabilities |

**Retained:** `GET /api/v1/v4/devices/esphome/preview`, `POST /api/v1/v4/devices/onboard/esphome` (import existing YAML).

## Supported Phase 1 hardware

**Platforms:** ESP32, ESP8266

**Boards:** ESP32 DevKit, ESP32-C3 DevKitM-1, NodeMCU v2, ESP-01 (1 MB)

**Components:** DHT11/DHT21/DHT22 (temperature + humidity), GPIO relay/switch

## Generated YAML location

`esphome/<slug>.yaml` on the server (root of the ESPHome config folder so the ESPHome dashboard lists the file). Legacy YAML (e.g. `living-room.yaml`) is unchanged.

**V4.0.087–088** briefly used `esphome/devices/` — ESPHome does not show subfolder YAML on its home page. If you created a device in that window, move the file to the root on the server: `mv ~/nexternel/esphome/devices/*.yaml ~/nexternel/esphome/`

## Example create flow (API)

```json
POST /api/v1/v4/devices/esphome/builder/create
{
  "config": {
    "version": 1,
    "platform": "esp32",
    "boardId": "esp32dev",
    "displayName": "Garden Controller",
    "roomId": "<uuid>",
    "components": [
      { "id": "climate", "kind": "dht", "variant": "DHT22", "pin": 4 },
      { "id": "light", "kind": "gpio_switch", "pin": 16, "name": "Garden Light" }
    ]
  }
}
```

Result: device row + sensors/relays + capabilities + `esphome/devices/garden-controller.yaml` + lifecycle `awaiting_installation`.

## Next phases (not in Phase 4)

- Additional component types (PMS air quality, pulse meter, etc.)
- Delete device removes YAML; ESPHome delete sync
- USB install from browser (web.esphome.io)
