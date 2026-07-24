# Nexternel V3 — UI skins / templates

| Field | Value |
|-------|--------|
| **Version** | V3.1.026+ |
| **Purpose** | Pluggable UI chrome (theme + shell), not dashboard widget layouts |

## Built-in skins

| Id | Label | Notes |
|----|-------|--------|
| `mui-dashboard` | MUI Dashboard | Default — free MUI dashboard-style side menu |
| `classic` | Classic | Original flat top AppBar |

Select under **System → Appearance**. Choice is stored in browser `localStorage` (`nexternel.uiSkin`).

## Local / paid import (Soft UI Pro, etc.)

1. Unzip the vendor template under `Template/<name>/` (gitignored).
2. Add adapter: `apps/ui/src/skins/local/<id>/skin.ts` exporting `default` `UiSkin`.
3. Upload `apps/ui` (including `skins/local`) to the Ubuntu server via FileZilla.
4. Rebuild: `docker compose build --no-cache ui && docker compose up -d ui`
5. System → Appearance → select the new skin.

**Never** put Soft UI Pro (or other paid packs) into GitHub. Export skips `apps/ui/src/skins/local/**` except README / `.gitkeep`.

See also `apps/ui/src/skins/local/README.md`.

## Contract

```ts
type UiSkin = {
  id: string;
  label: string;
  description?: string;
  createTheme: () => Theme;
  Layout: ComponentType; // must render <Outlet />
};
```

Skins are discovered via `import.meta.glob('./local/*/skin.ts')` plus built-ins in `apps/ui/src/skins/registry.ts`.
