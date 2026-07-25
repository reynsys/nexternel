# Nexternel V3 — Live switch idle bug (architecture note)

| Field | Value |
|-------|--------|
| **Fixed in** | V3.1.048 |
| **Symptom** | After long idle (~hours/day), dashboard switch click does not stay ON; reverts after seconds. Refresh fixes. |

## Root cause

1. **Live WebSocket died and never reconnected** (`connectLiveSocket` had no `onclose` reconnect). Switch UI only reflected `capability.updated` / `hello` over WS.
2. **HTTP command could still succeed** (access token refresh on 401), so the relay might toggle on the device — but this tab never learned the new state.
3. **Server `toggle` used in-memory cache**, not the UI’s displayed state — if UI and cache diverged while WS was dead, a click could publish the wrong command.
4. Secondary: retained MQTT `OFF` could briefly overwrite an optimistic `ON` on reconnecting clients.

Refresh “fixed” it by opening a **new** WS and rehydrating capability state.

## Fix (V3.1.048)

| Layer | Change |
|-------|--------|
| UI WS | Reconnect with backoff; refresh JWT before connect; reconnect on tab visible / online |
| Switch widget | Explicit `on`/`off` from displayed state; apply HTTP `{ value }` into parent state; show errors |
| Live page | Same command/apply pattern |
| API state-cache | Ignore retained MQTT that would undo a non-retained write &lt; 2.5s old |

## Verify

1. Open dashboard, leave overnight (or close laptop lid).
2. Wake, click a switch — should stay ON without refresh.
3. Troubleshoot / Live page: same behaviour.
