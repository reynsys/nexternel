# Nexternel — Changelog

All notable changes to the Nexternel smart-home stack are documented here.

**Version format: VX.Y.Z**

| Part | Meaning | Example |
|------|---------|---------|
| **X** | Project generation — major UI or architecture revision | `2` = Nexternel platform era |
| **Y** | Hardware revision — ESP32 board / sensor layout changes | `1` = initial hardware |
| **Z** | Software release — increments on each deployable code change | `008` = Phase 3 |

**Stack:** Docker on Ubuntu — Mosquitto, InfluxDB, PostgreSQL, Node-RED, Next.js web app, ESPHome.

Newest releases are listed first.

## V2.1.161 — 19/07/2026

- Widget title divider: extra clearance below the line so content no longer overlaps (gauges, relay panels)
- Garden Relays grid: slightly shorter switch cells and smaller toggles

## V2.1.160 — 19/07/2026

- Widget titles: solid inset divider under every title (replaces dashed line); applied via `WidgetTitleBar` on gauges, sensors, relays, speed test, activity log, and device status

## V2.1.159 — 19/07/2026

- GitHub publish: stamped remaining top-level paths (`db`, `esphome`, `mosquitto`, `nodered`, `scripts`, license/meta) so one commit can show `Updated (V2.1.159).` on every file
- Dropped optional `.gitattributes` / `docs/images/CAPTURE.md` from the public export

---

## V2.1.158 — 19/07/2026

### Docs — README trimmed and reordered

- Removed long “why technology / PuTTY vs FileZilla / spreadsheet grid” filler
- Moved **Installation** up; kept setup steps shorter and clearer
- Single short dashboard section; widgets detail stays in `docs/DASHBOARD-WIDGETS.md`

---

## V2.1.157 — 19/07/2026

### Docs — README: Mosquitto is the MQTT broker

- Clarified that **MQTT** is the protocol and **Mosquitto** is the broker (not two separate products)

---

## V2.1.156 — 19/07/2026

### Docs — README cleanup

- Removed version/WIP blurb and the extra “databases mix-up” section
- Softened repository table wording; renamed **What you get** → **System components**

---

## V2.1.155 — 19/07/2026

### Docs — README repository layout and database clarification

- Rewrote the README opening: About, How it works, and **What’s in the repository** (directories named clearly)
- Clarified **PostgreSQL (`db/`)** vs **InfluxDB** (Docker service + volume — no source directory)
- Rebranded leftover “DAMN Home” comments in `db/init.sql` and `mosquitto/config/mosquitto.conf`

---

## V2.1.154 — 17/07/2026

### Fix — Digital clock type fits the widget

- Reduced digital clock time/date clamp so the readout stays readable without overflowing the cell (Calendar sizes unchanged)

---

## V2.1.153 — 17/07/2026

### UI — Larger Calendar and Digital Clock type

- **Calendar:** larger month title, weekday headers, and day numbers; day grid fills the widget height so type scales with cell size
- **Digital clock:** larger time (and date) via dedicated `widget-fit-clock-*` sizes

---

## V2.1.152 — 17/07/2026

### Docs — Changelog and dashboard widgets guide on GitHub

- **CHANGELOG.md** is included in the GitHub export (version history, newest first; current release at the top)
- Added **[docs/DASHBOARD-WIDGETS.md](docs/DASHBOARD-WIDGETS.md)** — what you can add to the dashboard (gauges for temperature / humidity / CO₂, switches & relays, charts, clock, calendar, weather, internet speed, system widgets)
- README links to the changelog and the widgets guide
- Tall-cell (F11) gauge centering remains as in V2.1.151

---

## V2.1.151 — 17/07/2026

### Fix — Fullscreen (F11) empty space under gauges

- Normal browser mode unchanged: dial still **fills** wide cells
- When the dial region is tall (`max-aspect-ratio: 1.55/1`, typical F11), the dial uses a natural semicircle stage and is **vertically centered** so spare height is split above/below instead of pooling under the arc

---

## V2.1.150 — 17/07/2026

### Fix — Fill dials like Studio; Speed Mbps in SVG again

- Dropped dashboard aspect-meet (Temp/Humidity were postage-stamp sized with empty space around them)
- Dial host matches Studio fill model: `width/height 100%` of the remaining widget box (same idea as `height: calc(100% - 30px)` in Studio)
- Internet Speed Mbps is the SVG `valueLabel` again (forced `22px`, `offsetY: -28`) — HTML overlays kept sitting under the arc on tall cells

---

## V2.1.149 — 16/07/2026

### Fix — Center dials on tall monitors; lower Speed Mbps in hollow

- Dashboard gauges use a **centered aspect-meet** dial again so tall cells get equal space above/below (other monitor no longer looks top-heavy with empty space under the arc)
- Meet box stays full-size (`GAUGE_MEET_INSET = 1`); aspect `1.7 / 1`
- Internet Speed Mbps is a child of the dial frame at **bottom ~9%** of the hollow (lower than before, still inside the gauge — not under it)

---

## V2.1.148 — 16/07/2026

### Fix — Undo V2.1.147 overshoot; value in hollow; Speed Mbps

- Reverted heavy bottom margin / padding that shrank dials and dropped °C/% onto the arc
- Light dial inset + modest SVG bottom margin (~0.045) so arc ends stay visible
- `resolveValueLabelOffsetY`: default ~−22 into the hollow; replace large positive Studio offsets that sat on the arc
- Internet Speed: reliable HTML Mbps centered at ~62% of the dial area (SVG value was rendering as “-”)

---

## V2.1.147 — 16/07/2026

### Fix — Gauge bottoms + Speed Mbps clipped

- Arc bottoms were cut off because SVG **bottom margin was forced to 0** (value sat on the clip edge)
- Restored bottom margin (~0.10) and a small dial-host padding inset so the full semicircle and value stay visible
- Internet Speed always shows SVG `valueLabel` (saved Studio `hide` was blanking Mbps to a stray “-”)

---

## V2.1.146 — 16/07/2026

### Fix — Stop meet/overlay; gauges fill the cell again

- Removed dashboard **aspect-meet** boxes (they left dials tiny with empty space and still clipped sides)
- Removed Internet Speed **HTML Mbps overlay** (it sat at the bottom of tall cells while the arc stayed at the top)
- All gauges use the same path: dial **fills** the remaining cell height; value is the SVG `valueLabel` inside the arc (Temp, Humidity, Speed)
- Side margins ~0.08 so arc ends stay in the SVG without shrinking the dial into a postage stamp

---

## V2.1.145 — 16/07/2026

### Fix — Gauge side cuts (SVG margins, not shrink)

- Straight left/right cuts were from the arc drawn past the SVG viewBox (tiny side margins), not from the widget shell alone
- Enforced minimum **side** `marginInPercent` (~0.12); removed meet-box shrink (`GAUGE_MEET_INSET = 1`) that made dials smaller without fixing the cut
- Slightly taller meet aspect (`1.35 / 1`) + `svg { overflow: visible }` so ticks can breathe

---

## V2.1.144 — 16/07/2026

### Fix — Gauge left/right edge clipping

- Meet dial box is inset (`GAUGE_MEET_INSET`) so arc ends and outer ticks stay inside the widget’s `overflow: hidden` + rounded shell (without setting shell `overflow: visible`, which collapses flex height)
- Slightly more side margin in the SVG; frame/` .gauge` may paint past the box, slot still clips safely

---

## V2.1.143 — 16/07/2026

### Fix — Temp/Humidity bottom clip; larger Speed arc

- Restored **aspect-meet** dial boxes (fill-stretch was shifting Temp/Humidity down and clipping the arc bottom)
- Tighter shared margins + capped saved Studio margins so arcs use more of the meet box (less empty left/right)
- Kept the Internet Speed flex-height chain so the meet host still measures full cell height; Mbps stays inside the frame

---

## V2.1.142 — 16/07/2026

### Fix — Gauges fill the dial region again

- Dropped cell **aspect-meet** letterboxing (centered dials with large empty bands around Temp/Humidity)
- Dial SVG fills the remaining widget height; value stays inside the dial host (SVG for Temp/Humidity; Mbps overlay child for Speed)
- Fixed Internet Speed flex chain so the dial gets full height (was collapsing tiny with Mbps sitting under the arc)

---

## V2.1.141 — 16/07/2026

### Responsive standard gauge model (all monitors)

- One **cell-based meet dial** for Temperature, Humidity, and Internet Speed: largest aspect-preserving box centered in the dial region
- Numeric value stays **inside that dial box** (SVG for Temp/Humidity; Mbps HTML child of the frame for Speed)
- Removed fill-stretch / outer-widget overlay / cellAspect forks that fixed one screen and broke another
- Aspect ratios SSoT: `2/1.2` (semicircle/grafana), `1/1` (radial) in `gauge-cell-layout.ts`

---

## V2.1.140 — 16/07/2026

### Fix — Restore Temperature/Humidity; calm Internet Speed layout

- **Temperature / Humidity:** restored saved `valueLabel.offsetY` and original shared margins (a global offset strip had pushed dials down and clipped the bottom)
- Removed unused **cellAspect** path from the dial host (it kept making Speed tiny)
- **Internet Speed:** large fill dial again; Mbps overlay sits near the **baseline** of the dial area (not mid-arc overlap); no oversized custom margins

---

## V2.1.139 — 16/07/2026

### Fix — Internet Speed arc bottom clipped; Mbps missing

- Kept a **large fill** dial (no tiny aspect box)
- Mbps shown as an **HTML overlay in the arc hollow** (SVG value was clipped again)
- Slight bottom margin on the speed dial only so semicircle ends stay visible
- Overlay anchored from the **top** of the dial area so it stays in the hollow on tall/short cells
- Typed `marginInPercent` to allow per-side margins (fixes Docker TypeScript build, including Studio sandbox bridge)

---

## V2.1.138 — 16/07/2026

### Fix — Internet Speed dial matches Temperature / Humidity again

- Removed aspect-fit + HTML Mbps overlay (tiny dial at the top, value below the arc)
- Speed dial **fills the cell** with Mbps as the **SVG value inside the arc** — same approach as Temperature / Humidity
- LAN / WAN stay at the footer

---

## V2.1.137 — 16/07/2026

### Fix — Relay switches sync across browsers; speed dial consistent on all monitors

- Switches now **poll shared relay state** every ~4s (`/api/relays/states`) so ON/OFF updates on every open dashboard, not only the screen that clicked
- Internet Speed: Mbps overlay is **inside the dial frame** and the dial uses centered aspect-fit so size/position match across different monitor sizes

---

## V2.1.136 — 16/07/2026

### Tweak — Internet Speed Mbps lower for 3-digit values

- Dropped the Mbps overlay further so wider readings (e.g. 100+) stay clear of the arc

---

## V2.1.135 — 16/07/2026

### Tweak — Internet Speed Mbps lower in the arc

- Moved the Mbps overlay down toward the semicircle baseline (was sitting too high in the hollow)

---

## V2.1.134 — 16/07/2026

### Fix — Internet Speed dial size + visible Mbps in the arc

- Dropped aspect-fit for speed (it left empty space under a small dial)
- Dial **fills** the cell again; Mbps is an **HTML overlay in the arc hollow** (SVG value was clipped to a white speck)
- Overlay does not use a flex row, so the gauge stays large; LAN/WAN remain at the footer

---

## V2.1.133 — 16/07/2026

### Fix — Internet Speed value inside the arc; full dial visible

- Mbps reading sits **inside** the gauge (same as Temperature / Humidity), not under it
- Speed dial uses centered **aspect-fit** so semicircle ends are no longer flat-clipped
- Removed the HTML value row so the dial can use that space; LAN/WAN stay at the footer

---

## V2.1.132 — 16/07/2026

### Fix — Internet Speed Mbps and arc bottom clipped

- Speed dial uses **compact** layout: Mbps as HTML under the arc (SVG value was clipped by `overflow: hidden`)
- Small bottom inset on the dial so semicircle endpoints are fully visible
- LAN / WAN stay at the widget footer below the Mbps readout

---

## V2.1.131 — 16/07/2026

### Fix — Internet Speed gauge fills the widget; LAN/WAN at bottom

- Speed dial uses the same **fill-the-cell** layout as Temperature / Humidity (no tiny clipped arc)
- **LAN / WAN** moved to the **bottom** of the widget
- Mbps reading stays **inside** the dial; removed the extra HTML value row that stole height
- Compact title row (no dashed title-bar margin); cleared legacy negative `offsetY` on saved speed designs

---

## V2.1.130 — 16/07/2026

### Fix — Maximize Temperature / Humidity gauge size in the widget

- Dashboard gauges **fill the whole cell** (Studio-style) instead of shrinking into a small aspect box
- Header is one row: **title + area** on the left, **icon** on the right (frees vertical space for the dial)
- Reading stays **inside** the dial again (not a separate row below the gauge)
- Dropped the title bar dashed rule / extra margin that was eating dial height

---

## V2.1.129 — 16/07/2026

### Fix — Gauge left-aligned, clipped, and undersized

- **Cause:** `overflow: visible` on the gauge shell/fit-root broke flex height measurement, so the dial frame collapsed to a small left-aligned box and clipped the arc
- Restored measurable flex height (`overflow: hidden`) and centered the dial with CSS grid `place-items: center`
- Dashboard gauges use **compact** layout (arc in SVG, value as HTML below) so `10.0°C` / `%` is never clipped inside the dial
- Slightly taller aspect frame so Temperature / Humidity use more of the widget cell

---

## V2.1.128 — 16/07/2026

### Fix — Gauge dial clipped and undersized in widget frame

- **Cause:** Widget shell / fit-root `overflow: hidden` was cutting off arc ends and outer tick labels; the dial aspect box was also too wide (unused vertical space)
- Platform gauges use `overflow: visible` on the shell and fit root so the full dial is visible
- Slightly taller aspect frame and tighter side margins so Temperature / Humidity dials use more of the cell

---

## V2.1.127 — 16/07/2026

### Fix — Temperature / Humidity gauge widget frame and centering

- Platform gauges (Temperature, Humidity, and other `gauge-*` widgets) now apply Appearance **Shape**, **Style**, border, and padding on the live Dashboard — same shell as other widgets
- Dial centering improved so gauges stay visually centered in the cell on any monitor size (aspect-fit frame + centered SVG host)

---

## V2.1.126 — 12/07/2026

### Internet speed widget — single download gauge, 1×1 default

- **Save design** no longer forces 2×2 span (fixes “Grid is too small” when saving gauge design in a 1×1 cell)
- Speed test shows **one download gauge** plus **LAN / WAN IP** addresses (upload dial removed)
- **All new widgets** default to **1×1** cells (generic, library, and classic catalogs)

---

## V2.1.125 — 12/07/2026

### Fix — TypeScript build (Warm Glow pointer `maxFps`)

- Removed `maxFps` from catalog preset (not in platform pointer type; runtime default is fine)

---

## V2.1.124 — 12/07/2026

### Fix — TypeScript build (`prepareGalleryArc` clone type)

- Gallery arc clone typed as `NonNullable` after null guard (fixes Docker `npm run build`)

---

## V2.1.123 — 12/07/2026

### Fix — Warm Glow gallery preview unavailable

- **Clone gallery arc config** before render so react-gauge-component cannot mutate shared preset data (stale subArc limits e.g. 33 on 0–1 scale)
- **`prepareGalleryArc`**: drop conflicting `subArcs` when using `nbSubArcs`, clamp arc width for small cards
- **Warm Glow** explicit gallery props + value clamped to 0–1; gallery error boundary resets on value change

---

## V2.1.122 — 12/07/2026

### Fix — subArc limit crash when editing gauge range

- **Clamp/scale subArc limits** to current min/max (fixes `limit 33` error on Frost Crystal, Warm Glow, etc. after range edits or preset swaps)
- **Min/max inputs** in Live Preview rescale zone limits and ticks automatically
- **Gallery apply** rebuilds a clean sandbox from the preset
- **Live preview error boundary** — invalid config no longer crashes the whole Studio page

---

## V2.1.121 — 12/07/2026

### Fix — Widget Studio client crash on open

- **Normalize platform** on load (`binding`, `presetId`, legacy aliases) — fixes crash when saved config omitted `binding`
- **`sensorIdFromBinding`** tolerates missing binding
- **Gauge Gallery**: staggered dial mount, per-card error boundary, non-interactive previews (display-only)

---

## V2.1.120 — 12/07/2026

### Fix — Gauge Gallery implicit `any` in formatters

- Explicit `(v: number)` on gallery `formatTextValue` callbacks (strict TS build)

---

## V2.1.119 — 12/07/2026

### Fix — Gauge Gallery label props TypeScript build

- `withLabels()` accepts runtime label shape (`offsetY`, custom ticks, etc.) — npm `ValueLabel` types are incomplete

---

## V2.1.118 — 12/07/2026

### Fix — Gauge Gallery syntax error (build)

- **default** branch in `gauge-gallery-props.ts` missing `{` after `withLabels(` — Turbopack parse failure

---

## V2.1.117 — 12/07/2026

### Fix — Gauge Gallery TypeScript build

- Gallery props use `as GaugeComponentProps` for `startAngle` / `endAngle` (npm types lag behind react-gauge-component runtime)

---

## V2.1.116 — 12/07/2026

### Fix — Gauge Gallery build (Radial Elastic preset)

- **Radial Elastic** `subArcs` entries now include required `color` fields (fixes Docker `npm run build` TypeScript error)

---

## V2.1.115 — 12/07/2026

### Gauge Studio — full Gauge Gallery (16 presets)

- **All 16** react-gauge-component gallery presets (Server Temperature through Grafana Smooth)
- **Gauge Gallery** section below the editor with **1× / 2× / 3× / 4×** column layout (reference card heights)
- Gallery cards: title, description, live dial, **pencil** (load into editor), **copy** (JSX)
- Gallery dials use reference formatters; **Auto** animates gallery values in staggered batches
- Toolbar preset list replaced with pointer to gallery below

---

## V2.1.114 — 12/07/2026

### Gauge Studio — match react-gauge-component sandbox preview

- **Live Preview** uses the reference sandbox model: **400×300** resizable card (`min` 200×150), dial fills `calc(100% - 30px)`, action bar **30px**
- **`GaugeComponent` full container** in studio mode — no aspect-ratio frame or custom studio margins; library handles layout per type
- Type/preset changes still remount via `platformFromPreset` path (stable Radial/Grafana switching)

---

## V2.1.113 — 12/07/2026

### Gauge Studio — radial/Grafana preview size & position

- **Revert V2.1.112 studio margins** — extra bottom/top insets shrank radial/grafana and pushed them to the top of Live Preview
- **One studio aspect frame** `2/1.05` for all types (matches semicircle, which looked correct)
- **Preview card** default height **320px** (was 300px) — a little room for value labels without shrinking the dial

---

## V2.1.112 — 12/07/2026

### Gauge Studio — radial dial centred in Live Preview

- **Radial** studio aspect frame `1/1.05` (square, centred) instead of wide `2/1.2` that pushed the dial down and clipped the value readout
- **Studio margins** per type (`GAUGE_STUDIO_MARGINS_BY_TYPE`) — radial/grafana get bottom inset so labels fit inside the fixed preview card
- **Grafana** studio aspect `2/1.28`; semicircle unchanged `2/1.05`
- Studio dial uses `layoutContext: "studio"` in `buildGaugeComponentProps`

---

## V2.1.111 — 12/07/2026

### Gauge Studio — Radial/Grafana type buttons (crash fix)

- **Type selector** now uses **`platformFromPreset()`** — identical path to Random / Gallery (proven working); removed explicit design snapshot on type change that crashed react-gauge-component
- **Studio aspect frame:** single ratio `2/1.2` for all types — avoids ResizeObserver loop when switching type
- **`useGaugeAspectFit`:** skip setState when frame size unchanged
- **Dial remount:** `dialGeneration` key + `startTransition` so D3 gauge tears down cleanly before next type mounts

---

## V2.1.110 — 12/07/2026

### Gauge Studio — fix Radial/Grafana type selector crash

- **Root cause:** Semicircle / Radial / Grafana buttons only updated `design` via sandbox — left stale `presetId` (e.g. server-temperature) while gauge type changed; Random and Gallery presets sync `presetId` + format (which is why they worked)
- **Fix:** new `platformFromGaugeTypeChange()` — same state path as Random/Gallery (presetId, format, design together)
- Gallery presets now use `platformFromPreset()` for consistency

---

## V2.1.109 — 12/07/2026

### Gauge Studio — fix white screen on Radial / Grafana

- **Crash fix:** studio preview uses type-specific **aspect frame** again (not full-container fill) — avoids react-gauge-component resize/state crash on type change
- **Remount:** `key={gaugeType}` on dial so D3 gauge fully re-inits when switching Semicircle ↔ Radial ↔ Grafana
- **Type change:** strip conflicting `subArcs` / `nbSubArcs` when applying template arc
- **Studio ratios:** radial `1/1.08`, Grafana `2/1.28` inside the fixed 300px preview card

---

## V2.1.108 — 12/07/2026

### Gauge Studio — fixed Live Preview card size

- **Live Preview** dial card is **300px tall for all gauge types** (semicircle, radial, Grafana) — no vertical jump on Random or type change
- Gauge scales inside the fixed window (Grafana may look smaller; radial/semicircle fill more — same as reference sandbox)
- User can still drag the card corner to resize vertically

---

## V2.1.107 — 12/07/2026

### Gauge Studio — radial & Grafana preview layout

- **Studio dial:** full-container render (like react-gauge-component sandbox) — no aspect-ratio frame in Live Preview
- **Radial:** centred in preview (was offset left/up inside wrong aspect box)
- **Grafana:** taller preview card so value readout under the arc is not clipped
- **Heights:** type-specific `gaugeStudioPreviewHeight()` in `gauge-cell-layout.ts`

---

## V2.1.106 — 12/07/2026

### Gauge Studio — live preview dial visible again

- **Fix:** studio preview cell no longer collapses the dial host to 0×0 (centering moved back to aspect-frame only); gauge renders in Live Preview again

---

## V2.1.105 — 12/07/2026

### Gauge Studio — sandbox layout (4-column)

- **Layout:** preview column ~24% / fixed max 360px (like react-gauge-component sandbox); tools fill remaining width in **three** columns (Arc & colours · Pointers · Value label & ticks)
- **Fix:** removed empty third grid track (`grid-cols-3` with only two column divs)
- **Live preview:** capped height (~400px); dial centered in preview cell
- **Scroll:** per tool column instead of scrolling the whole right half

---

## V2.1.104 — 12/07/2026

### Gauge Studio fixes (units, save, layout, icons)

- **Wrong units on dashboard:** sensor unit now wins over stored `format.unit` (fixes Temperature showing Mbps / Humidity showing °C after cross-preset edits)
- **Save reverting:** platform PATCH replaces `design`/`format` wholesale — no deep-merge of old format onto new design; `buildStudioPlatformSnapshot()` on save
- **Random preset:** `platformFromPreset()` applies preset format/design cleanly (no merge with previous widget format)
- **Sensor gauges on save:** strip stored `format.unit` — unit comes from the bound sensor only
- **Studio layout:** equal two-column grid fills width (no empty right gap)
- **Live preview:** dial centered in studio cell; fixed **Radial** type selector icon (full ring, centered)
- **Randomize** no longer keeps stale format from previous preset

---

## V2.1.103 — 12/07/2026

### Gauge fit — measured dial size + 2×2 speed test

- **`useGaugeAspectFit`:** ResizeObserver measures the dial slot and sets explicit width/height (like SVG `preserveAspectRatio` meet) — fixes clipped arcs on all platform gauges
- **Internet speed 1×2 cells:** too short for two dials; short-cell mode hides header/title chrome; editor preview warns to use **≥2 rows**
- **Gauge Studio save** auto-expands Internet speed widgets to **minimum 2×2** (`SPEED_TEST_MIN_ROW_SPAN` / `COL_SPAN`)
- Config panel notes 2×2 minimum for speed test

---

## V2.1.102 — 12/07/2026

### Dashboard gauge clip — aspect frame fix

- **Root cause:** Studio preview card is large; dashboard dual-column cells gave `react-gauge-component` almost no height, so the SVG arc was clipped.
- All platform dials use an **aspect-ratio frame** (`gauge-aspect-slot` / `gauge-aspect-frame`) — same idea as legacy `NetworkSpeedGauge` `preserveAspectRatio` fit.
- **Internet speed:** compact layout (arc in frame, **Mbps as HTML below**), shared Download/Upload label row, footer hidden when platform design is saved.
- **`savedGaugePlatform`:** always returns sanitized config when `definitionId` is `gauge` (even if strict schema parse fails).

---

## V2.1.101 — 12/07/2026

### Dashboard matches Gauge Studio preview

- **Internet speed dials** use the same render path as Studio (`standard` layout + `WIDGET_FIT_GAUGE` flex chain) — removed compact-only HTML readout that made dashboard look different
- **`mergeGaugeDesign`:** saved Studio snapshots no longer re-blend the `network-speed` preset arc onto radial/grafana types (fixes “saved type looks totally different on dashboard”)
- **Gauge type selector** applies type-appropriate arc/pointer/ticks via `applyGaugeTypeChange()` when switching Semicircle / Radial / Grafana
- Platform speed-test widget drops footer row and reserves more height for the dial row

---

## V2.1.100 — 12/07/2026

### Platform gauge layout — stop the clipping loop

- **Single source of truth:** `widget-platform/gauge-cell-layout.ts` (margins, compact context, dial host classes)
- **Cursor rule:** `.cursor/rules/damn-home-gauges.mdc` — documents flex chain, banned hacks, and fix checklist for agents
- Dial host uses **flex `1 1 0` fill** (removed `absolute inset-0` wrapper that broke ResizeObserver height)
- **Internet speed** compact dials: arc only inside `react-gauge-component`; Mbps readout is **HTML below** the dial (same pattern as legacy `NetworkSpeedGauge`) so values are never clipped
- Removed default negative `valueLabel.offsetY` hacks from `build-props.ts`

---

## V2.1.099 — 12/07/2026

### Internet speed widget — apply Gauge Studio saves

- **Root cause:** Widget Studio saved `config.platform` but the dashboard still rendered the legacy `NetworkSpeedGauge` SVG, which ignored saved design.
- Download and upload dials now use **`SpeedTestDial`** with the saved platform gauge when `config.platform` is present.
- Unsaved speed-test widgets keep the legacy SVG dials until you open Gauge Studio and save once.

---

## V2.1.098 — 12/07/2026

### Gauge dial fill + value label

- Restored **react-gauge-component** per-type margins (bottom `0`) so dials fill the cell again instead of shrinking
- Default **value label offsetY** pulls the readout up into the arc bowl (semicircle −22, grafana −18) so it is not clipped at the bottom
- Dial uses **absolute inset fill** inside a flex `gauge-dial-wrap`; removed `overflow: hidden` on the gauge root that was cutting off labels
- Live gauge status line only shows in taller cells (`widget-show-when-tall`)

### Gauge Studio layout

- Studio route locks the admin shell to **viewport height** (no page scroll); only the right-hand toolbar scrolls
- Grid is **40% preview / 60% tools** (`2fr` / `3fr`) so the preview is not squeezed and the right column fills the width
- Preview card uses widget **aspect ratio** with sensible min/max height

---

## V2.1.097 — 12/07/2026

### Gauge fit inside widget cell

- Balanced dial margins (small bottom/top inset) so the arc is large but value and tick labels stay inside the cell
- Removed negative value-label offset that pushed readouts into the clip zone
- Slightly smaller responsive value font; gauge root uses `max-height: 100%` and `overflow: hidden` to prevent overflow past the widget frame

---

## V2.1.096 — 12/07/2026

### Build fix

- Restored missing `GaugePrimitive` import in `GaugeStudioDial.tsx` (Docker `npm run build` TypeScript error)

---

## V2.1.095 — 12/07/2026

### Gauge Studio layout & dial size (again)

- Studio uses full-width **two-column grid** (preview ~40%, tools ~60%) — removes empty right margin and narrow shrunken panel
- Preview card spans its column; toolbar columns fill the right side at all breakpoints
- **Dial size fix:** removed oversized bottom margins (they were shrinking the arc to a tiny circle); semicircle/grafana use bottom margin 0 like react-gauge-component defaults
- Uniform saved `marginInPercent` values no longer steal bottom space on semicircle/grafana
- Gauge flex layout uses column flex instead of broken absolute positioning
- Type selector icons share one **64×40 viewBox** and aspect ratio so all three buttons match

---

## V2.1.094 — 12/07/2026

### Gauge Studio & dashboard fixes

- **Type selector:** Semicircle / Radial / Grafana use static SVG thumbnails (live mini-gauges were invisible in small slots)
- **Value readout:** default per-type dial margins + slight upward offset so numeric values are not clipped in studio or dashboard cells
- **Save design:** syncs full sandbox state before PATCH, sanitizes values to schema limits, replaces stored design wholesale (fixes edits not appearing on dashboard)
- Relaxed platform schema (arc padding, pointer length) so valid studio edits are not rejected on save

---

## V2.1.093 — 12/07/2026

### Gauge Studio — sandbox editor parity

- **Type selector fix:** mini Semicircle / Radial / Grafana previews clipped and aligned inside their buttons
- **Resize handle** on the live preview card (`resize: both`, bottom-right grip)
- **Drag interaction** on the preview dial (toggle with Drag checkbox); supports multi-pointer drag
- **Copy as JSX** / **Paste** accepts `<GaugeComponent … />` or saved JSON
- **Multi-pointer accordions** in the Pointers panel — add, edit, remove pointers like the reference editor

---

## V2.1.092 — 12/07/2026

### Gauge Studio — side-by-side editor layout

- Live preview on the **left**; design tools on the **right** (matches react-gauge-component sandbox editor)
- Preview panel: gauge card with **Random / Paste / Copy** bar under the dial, value slider with **Auto**, min/max inputs, and visual **gauge type** selector
- Removed duplicate “Gauge type & range” from the toolbar; sensor binding moved to **Dashboard binding** section
- Studio uses viewport height on desktop so the tool column scrolls instead of the whole page

---

## V2.1.091 — 12/07/2026

### Gauge widgets — dial fills the cell again

- Fixed platform gauge layout: dial area uses the same `gauge-dial-wrap` + absolute fill pattern as legacy SVG gauges so `react-gauge-component` measures the full cell body
- Removed broken “Gauge size in cell” slider from Widget Studio (dial size is layout-driven, not a margin hack)
- Edit dashboard: gauge widgets skip proportional scale transform so ResizeObserver reads correct dimensions
- Default margins defer to react-gauge-component per-type values; value/tick labels scale with container queries

---

## V2.1.090 — 12/07/2026

### Widget Studio — gauge size inside cell (not widget frame)

- Removed Grid/Medium/Large/Fill widget resizing; preview frame stays at dashboard grid size
- **Gauge size in cell** slider (55–165%) adjusts dial margin inside the widget; saved on Save design
- Same control under Arc & colours in the design toolbar

---

## V2.1.089 — 12/07/2026

### Fix — Widget Studio stuck on “Loading studio…”

- React hooks order fix (`useMemo` was after conditional returns, crashing once data loaded)
- Load errors surfaced in UI; fetch wrapped in try/catch

---

## V2.1.088 — 12/07/2026

### Build fix — restore DashboardLayoutDto import in Widget Studio

---

## V2.1.087 — 12/07/2026

### Widget Studio — visible preview controls + version badge

- Preview size bar (Grid / Medium / Large / Fill) highlighted at top of live preview
- Studio subtitle shows running app version (e.g. V2.1.087) for deploy verification

---

## V2.1.086 — 12/07/2026

### Widget Studio — larger live preview

- Preview size buttons: Grid, Medium, Large, Fill (default Large)
- Toggle to hide widget frame and show gauge only
- Taller preview pane; gauge dial fills available height

---

## V2.1.085 — 12/07/2026

### Build fix — remove unused sandbox bridge cast

- Dropped dead `sandboxToGaugeProps` helper that referenced `pointers` missing from npm types

---

## V2.1.084 — 12/07/2026

### Widget Studio — full gauge sandbox (Step 2)

- Expanded designer to match react-gauge-component sandbox: arc colours/palettes, angles, effects, pointer, value label, tick marks
- Live preview with value slider and auto-animate
- Studio opens for all library gauges, radial stat, and internet speed widgets
- Gauges without saved `platform` config auto-migrate when opened in Studio

---

## V2.1.083 — 12/07/2026

### Build fix — missing GaugePlatformInstance import in studio

---

## V2.1.082 — 12/07/2026

### Build fix — sensor binding type narrowing

- `sensorIdFromBinding()` helper for discriminated union access

---

## V2.1.081 — 12/07/2026

### Build fix — gauge props single cast

- Full `GaugeComponentProps` built then cast once (npm types missing `startAngle`, etc.)

---

## V2.1.080 — 12/07/2026

### Build fix — gauge arc props type cast

- Arc/pointer props use safe pick + cast so npm `react-gauge-component` types do not block build

---

## V2.1.079 — 12/07/2026

### Build fix — gauge props vs npm types

- `build-props.ts` only passes arc/pointer fields supported by published `react-gauge-component` types

---

## V2.1.078 — 12/07/2026

### Widget platform — Step 1 (gauge)

- New `widget-platform` module: config schema (Zod), gauge presets, dual-read from legacy library gauges
- `react-gauge-component` as gauge renderer; live dashboard uses platform when `config.platform` exists or legacy `gauge-*` libraryId
- Full-page **Widget Studio** at `/admin/dashboard/studio/[widgetId]?layoutId=…`
- Gauge designer: preset gallery, sensor binding, type, range, arc width, value format
- API validates `config.platform` on widget create/update
- “Open Widget Studio” on gauge widgets in dashboard editor

---

## V2.1.077 — 12/07/2026

### Internet speed widget — fit and readout fix

- Mbps values moved below the dial as HTML (no SVG clipping)
- Single-line LAN/WAN header to free vertical space for gauges
- One adaptive footer line; hidden in short cells
- Dial uses tighter viewBox and scales with container queries

---

## V2.1.076 — 12/07/2026

### Internet speed gauge — layout and values

- Replaced `react-gauge-component` with custom SVG gauge (matches temp/humidity dials)
- Download/Upload Mbps values render reliably in the dial centre
- Tick marks sit outside the arc (no lines crossing the gauge)
- Gauges scale in 2-wide × 1-tall cells; removed fixed min-heights that clipped the dial
- Dropped unused `react-gauge-component` dependency

---

## V2.1.075 — 12/07/2026

### Build fix — NetworkSpeedGauge types

- Removed `offsetY` from value label config (not in published `react-gauge-component` types)

---

## V2.1.074 — 12/07/2026

### Gauges — template-based network speed + layout fixes

- Internet speed uses `react-gauge-component` (Template **Network Speed** preset), 0–500 Mbps ticks
- Temperature (semicircle) and humidity (ring): value drawn inside SVG, no HTML overlay overlap
- Removed broken custom `SpeedMiniGauge`; speed widget defaults to **2×2** for readable dials
- Simpler gauge CSS (`gauge-dial-wrap`, `gauge-speed-meter`) — dials get minimum height in cells

---

## V2.1.073 — 12/07/2026

### Global widget content fit

- One `@container/widget` per grid cell; `WidgetFitRoot` wraps all dashboard widgets
- Shared `widget-fit-body-region` / gauge SVG rules in `globals.css` (less clipping, responsive padding)
- Speed gauges: full bottom arc, ticks at 0–500 Mbps (every 100), value below the arc
- Library gauges (`RingGauge`, `SemicircleNeedleGauge`) use `widget-fit-gauge__svg`
- Agent rule: `.cursor/rules/damn-home-widget-fit.mdc`

---

## V2.1.072 — 12/07/2026

### Internet speed widget — gauges + correct LAN IP

- Full semicircle gauges (0–500 Mbps) with needle; green = fast, red = slow
- Removed Dl/Ul short labels — always Download / Upload
- LAN IP uses `SERVER_IP` from `.env` (not the Docker bridge address `172.18.x.x`)
- `SERVER_IP` passed into the web container; Network Status widget uses the same logic

---

## V2.1.071 — 12/07/2026

### Internet speed widget — gauges + LAN IP

- Download and Upload shown as compact arc gauges (Mbps in the centre)
- Labels renamed from Down/Up to Download/Upload
- Server LAN (internal) IP shown alongside WAN (external) IP
- New widgets default to 1×2 for better gauge layout

---

## V2.1.070 — 12/07/2026

### Build fix — automations relay types

- Fixed TypeScript error on the Automations page relay picker (Docker build)

---

## V2.1.069 — 12/07/2026

### Relay order — all switch widgets

- Shared `relay-order` helper applies stable registration order everywhere relays are listed
- Classic and library multi-switch panels, dashboard editors, and automations all use the same rules
- Existing widgets pick up the fix automatically — no need to re-apply each widget in Edit Dashboard

---

## V2.1.068 — 12/07/2026

### Relay rename — stable switch order

- Relay panels keep switch positions when you rename a relay (no alphabetical re-sort)
- Devices API and dashboard catalog order relays by registration time, not display name
- Renaming on the Devices page updates immediately without reloading the full device list

---

## V2.1.067 — 11/07/2026

### Internet speed widget — fits 1×1 cells

- Compact layout: IP, download/upload stats, minimal footer in small cells
- Container-query CSS scales text; extra detail shows in taller widgets
- Default size suggestion is now 1×1

---

## V2.1.066 — 11/07/2026

### Internet speed test widget

- New utility widget **Internet speed test** — external IP, download/upload Mbps, latency
- Server runs a test every 2–15 minutes (default 3); uses Cloudflare + ipify (no extra packages)
- Measures your **Ubuntu server** connection, not the browser device

---

## V2.1.065 — 11/07/2026

### Rebrand to Nexternel

- User-facing product name is now **Nexternel** (login, sidebar, browser title, docs)
- Removed unused `Template/Dashtrans/` copy (~370 files) — kept `Template/Component Lib/` for gauge reference
- **Unchanged for now** (avoids breaking your server): Docker container names, MQTT topic prefix `damnhome`, server folder `~/damn-home`, session cookie

---

## V2.1.064 — 11/07/2026

### Widget library — native SVG gauges (Phase 1)

- New **Gauges** category in the widget library
- **Semicircle needle gauge** — speedometer-style dial with colour zones (temperature-friendly)
- **Ring gauge** — circular ring with centre value (humidity / 0–100%)
- **Solid arc gauge** — thick semicircle fill (fuel-gauge style)
- Pure SVG + existing sensor bindings — no Highcharts or new chart libraries

---

## V2.1.063 — 08/07/2026

### Edit Dashboard — proportional widget scaling

- Widget previews scale down uniformly to match live dashboard proportions
- Ratio computed from editor vs home grid row/column sizes (including multi-cell spans)
- Fixes overlapping text in smaller editor cells without changing live dashboard layout

---

## V2.1.062 — 08/07/2026

### Edit Dashboard — live widget preview

- Grid cells now render **the same live widgets** as the home dashboard (no stub text)
- Editor grid is **~10% shorter** than the home dashboard to account for edit toolbar chrome
- Widget label strip only shows on the **selected** cell (overlay), freeing preview space
- Readings poll every 15s in the editor, matching the live dashboard

---

## V2.1.061 — 08/07/2026

### Edit Dashboard — same viewport-fit grid as home

- Edit grid uses the same **viewport-filled row sizing** as the live dashboard
- Grid area height matches the home dashboard (`100svh` minus header/padding)
- Column label row accounted for; sidebar panel matches grid height on large screens
- Removed near-square editor cell aspect logic

---

## V2.1.060 — 08/07/2026

### Main dashboard — fit 4×4 without scroll

- Grid rows are sized to **exactly fill** the available viewport height (no vertical scroll)
- **ResizeObserver** recalculates on window resize and different monitors
- Column widths unchanged (`1fr`); works for any column/row count in the layout

---

## V2.1.059 — 08/07/2026

### Main dashboard cell height (+20% trial)

- Home dashboard cells are **20% taller** with the same column width (`DASHBOARD_VIEW_ROW_HEIGHT_SCALE = 1.2` in `dashboard-grid.ts`)
- Slight vertical scroll if the grid exceeds the viewport; edit dashboard unchanged

---

## V2.1.058 — 08/07/2026

### Edit dashboard grid cells

- Reverted viewport-matched wide cells (too short — widget content was clipped)
- Editor cells are now **near-square** (height ≈ column width + 12% for the editor label strip)
- Live home dashboard layout unchanged

---

## V2.1.057 — 08/07/2026

### Edit dashboard cell proportions (fix)

- Grid row height now recalculates **after** the layout loads (previous hook ran before the grid mounted, so cells stayed at fixed 9.5rem)
- Editor grid gap matches live dashboard (`gap-2` / `md:gap-3`)

---

## V2.1.056 — 08/07/2026

### Fix

- **Edit dashboard** crash — React hooks were called after the loading early-return (client-side exception on `/admin/dashboard`)

---

## V2.1.055 — 08/07/2026

### Edit dashboard grid proportions

- Edit dashboard cell **height/width ratio** now matches the live home dashboard (computed from viewport, sidebar, columns, and rows)
- Editor row height updates when the window is resized or the grid column width changes
- Editor grid gap aligned to `gap-2` (closer to live dashboard spacing)

---

## V2.1.054 — 05/07/2026

### Relay panel & device admin UX

- **Garden Relays widget** — removed inner scroll; 2×2 grid fits four switches in the cell
- Relay labels show **full names** (Relay 1, etc.) — removed #1/#2 shorthand; rename on Devices updates the widget
- **Rename** on Devices page is a clear **outline button on the left** of each relay (relay controls + entities list)

---

## V2.1.053 — 05/07/2026

### Device relay panel polish

- Removed redundant **“Garden · 4 switches”** subtitle under the widget title
- **Grid layout** shows **#1, #2, #3, #4** (hover for full name) instead of a clipped “R” in narrow cells
- **Edit dashboard** sidebar scrolls; shows template name and hint to scroll for Placement / Widget source / Appearance
- **Widget source** lists all switches in the panel and links to Admin → Devices to rename relays

---

## V2.1.052 — 05/07/2026

### Device relay panels

- **Grid layout** now uses 2 columns (2×2 for four switches) instead of looking identical to list
- **Sensor dropdown removed** from switch/relay widget creation (it had no effect)
- **Optional readings** on device panels — check temperature, humidity, or both to show live values above the switches
- Edit existing panels via **Edit Dashboard → Widget source → Include readings**

---

## V2.1.051 — 05/07/2026

### Switches & relays widget picker

- **Switches & relays** filter no longer shows temperature/stat sensor templates (Gaussian stat is sensors-only)
- **Device panel** templates: list, grid, vertical buttons, horizontal buttons, and round buttons — each with distinct previews
- **List vs grid** previews now look different (grid shows 2 columns)
- **Single-relay** horizontal/vertical buttons are smaller and centered (not full-width)
- **Relay status card** renamed and clarified — shows ON/OFF status; toggle controls the relay (removed duplicate stat template)

---

## V2.1.050 — 05/07/2026

### Dashboard widget editing & relay UX

- **Edit widget** panel in Edit Dashboard — clearer sidebar when a widget is selected; binding editor for relay, device, sensor, and room sources
- **Widget title icons** — title only, icon only, or title + icon; expanded icon picker (power, light, garden, etc.)
- **Device relay panel (grid)** — compact 1×1 layout (icon + toggle, no vertical text scroll); 2-column grid only when the cell is large enough
- **Relay rename** on Devices page — rename relays inline (relay controls + entities panel); names flow to dashboard widgets

---

## V2.1.049 — 05/07/2026

### Widget picker UX

- **Switches & relays** filter now lists every relay template (including device panels and Gaussian stat)
- Filter tabs stay visible (sticky) above the scrollable template grid
- **Classic widgets** get visual preview cards (sensor, relay, device relays, device status, etc.)
- Switch/relay widgets default to **1×1** and scale with cell size via container queries

---

## V2.1.048 — 05/07/2026

### Multi-relay dashboard widgets

- **Device relay panel (list/grid)** — all relays from one ESP32 in one widget (2, 4, 6, 8…)
- **Classic widgets → All switches (one device)** — same panel via classic flow
- Single-switch widgets use compact horizontal layout (fixes clipped text in 1×1 cells)
- Devices admin: **Add relay panel to dashboard** shortcut for relay devices

---

## V2.1.047 — 05/07/2026

### Build fix

- Widget library catalog page includes new **Switches & relays** category (fixes Docker build TypeScript error)

---

## V2.1.046 — 05/07/2026

### Switch / relay widget library

- **Library templates → Switches & relays**: 6 switch styles (pill, compact, round, stat card, vertical, horizontal)
- Add-widget flow defaults to switch templates when relays exist; filter tabs for Switches vs Sensors
- **Classic widgets → Relay / switch** still available; relay picker shows device name
- All library switch widgets include working ON/OFF controls

---

## V2.1.045 — 05/07/2026

### Devices dashboard widget

- Online/offline now uses the same device status as the Devices admin page (MQTT + relays), not sensor readings only
- Scrollable compact list scales to many devices; summary shows `N/M online`
- Relay-only devices (e.g. Garden Relays) show Online correctly

---

## V2.1.044 — 05/07/2026

### MQTT diagnostics for relay devices

- **MQTT topics** panel: **Scan broker** and **Fix topics from broker** for mismatched entity IDs
- Device online detection also checks for any MQTT traffic on the device prefix
- Updated `esphome/garden-relays.yaml` template: explicit `id: relay_1` … `relay_4`, `inverted: true`, `RESTORE_DEFAULT_OFF`

---

## V2.1.043 — 05/07/2026

### Relay name / control fix

- Fixed YAML name parsing (`Switch 1` was truncated to `S`, causing duplicate entity `s` and wrong MQTT topics)
- **Sync ESPHome** now **updates** existing relays (names, entity IDs, GPIO, MQTT topics) — run again to repair
- Relay ON/OFF status refreshed from MQTT when loading Devices page

---

## V2.1.042 — 05/07/2026

### ESPHome relay sync fix

- YAML parser now detects relays **without** explicit `id:` (uses ESPHome name → `relay_1`, etc.)
- Supports `output:` + `switch:` boards, `${substitutions}`, and `!include` files
- Sync tries multiple YAML file name variants (`garden-relays`, `garden_relays`, …)
- Sync dialog shows which relay entity IDs were found in YAML

---

## V2.1.041 — 05/07/2026

### Relay devices

- **Offline** fixed for relay-only ESP32s (status uses MQTT relay state, not only sensors)
- **Sync ESPHome** on device card imports missing relays/sensors from YAML
- Improved YAML parsing for multi-relay boards (4+ switches)
- Relay **ON/OFF** controls and per-relay **+ Dashboard** link on Devices page

---

## V2.1.040 — 05/07/2026

### Devices — ESPHome registration

- Clarified that ESPHome Builder and Devices are separate steps (not a bug)
- Lists ESPHome YAML configs not yet registered in DAMN Home
- **Register device** / import from YAML auto-fills MQTT prefix, sensors, and relays

---

## V2.1.039 — 05/07/2026

### Weather widget

- Today’s high/low shown to the left of the weather icon (same style as forecast rows)

### Analog clock

- Hour hand light blue, minute hand light orange

### Calendar widget

- Compact layout for 1×1 cells so the full month fits without clipping

### Sensor charts

- X-axis shows evenly spaced times across the last 24 hours (not one label per reading)
- Tooltips show full date and time
- Chart shown by default; **Hide chart** toggles it off

---

## V2.1.038 — 04/07/2026

### Devices — online status

- Status now uses the same logic as live dashboard readings: fresh InfluxDB data counts as online (not only a new MQTT message during a 2.5s poll)
- Device list auto-refreshes status when the page loads

---

## V2.1.037 — 04/07/2026

### Devices page

- Full device cards with online/offline status, edit, live readings, MQTT topics, activity log
- Manage sensors and relays (add, enable/disable, remove)
- Test relays (ON/OFF), refresh status, duplicate template, export JSON
- Import MQTT prefix from ESPHome YAML; disable/enable devices
- Links to ESPHome dashboard, dashboard widget editor, and filtered automations

### Dashboard & automations

- Deep link from device: `/admin/dashboard?add=classic&type=device_sensors&deviceId=…`
- Automations page accepts `?deviceId=` to filter and pre-fill device trigger

### Backend

- `devices.is_enabled` column (auto-added on container start)
- Disabled devices excluded from dashboard catalog and live readings

---

## V2.1.036 — 04/07/2026

### Weather widget

- Removed weekday/condition line
- Today row fixed under title; forecast pinned to bottom (`mt-auto`) so readings no longer overlap forecast

---

## V2.1.035 — 04/07/2026

### Weather widget

- Today: icon left of temperature, humidity and wind stacked on the right
- Forecast excludes today (shows next 5 days only)
- Today block sits higher with clear gap above the forecast divider

---

## V2.1.034 — 04/07/2026

### Weather widget

- Redesigned layout: title on top, today centred with weather icon, forecast row underneath
- Forecast shows icon + horizontal max/min per day (no overlap)

### System information

- Removed storage row; added **server temperature** from Linux thermal sensors
- Docker web container mounts `/sys/class/thermal` (read-only) — upload `docker-compose.yml` too

### Widget library

- Taller preview frames so templates are not clipped
- Classic widgets section lists all sensor/relay/device types
- Utility + library previews aligned in grid

---

## V2.1.033 — 03/07/2026

### Build fix

- Restored missing `getCatalogEntry` import in `WidgetContent.tsx`

---

## V2.1.032 — 03/07/2026

### Build fix

- Fixed TypeScript error in `ChartTooltip` (`nameFormatter` prop not destructured)

---

## V2.1.031 — 03/07/2026

### Dashboard widgets

- **Add widget:** choose grid cell (A1, B2, …) when creating a widget
- **Weather:** 5-day forecast in a horizontal row under current conditions
- **Widget titles:** dashed divider line under title (edge to edge)
- **Tall widgets (H=2+):** content vertically centred in the spanned cells
- **Calendar:** weekday headers aligned with date columns
- **Charts:** larger plot area, compact legend, cleaner hover tooltip

---

## V2.1.030 — 03/07/2026

### Dashboard layout

- Home dashboard locked to viewport height (`h-svh`) to remove page scroll
- Widget content top-aligned with larger readable text (System info, etc.)
- Show chart fills the widget cell; hide chart collapses back without stretching neighbours
- Weather forecast shown beside current conditions (fits W=2 H=1)
- Edit dashboard: **Widget title** (placement) separated from **Sensor name** (card content)

---

## V2.1.029 — 03/07/2026

### Build fix

- Fixed Docker build failure caused by invalid Tailwind `@[min-height:…]` container queries
- Widget responsive sizing moved to plain CSS in `globals.css`

---

## V2.1.028 — 03/07/2026

### Responsive dashboard & widget fit

- Live dashboard grid fills the viewport (no page scroll); rows scale with screen height
- Widget content uses container-based fluid sizing — no inner scroll on 1-row widgets
- Weather forecast hides automatically in short cells
- **Storage used** shows occupied GB and % (not free space)
- Disk usage calculation uses available-space semantics on Linux

---

## V2.1.027 — 03/07/2026

### Widget fit, placement Apply, library previews, widget polish

- Taller grid rows (9.5rem) so single-height widgets are not clipped
- **Apply** button for Title / Cell / W / H in Edit dashboard
- Widget library previews use uniform aligned frames
- **Weather**: mph wind, 5-day forecast; default size 2×2
- **Calendar**: week starts Monday
- **Clock**: analog (classic/minimal/roman) and digital (standard/mono/bold) styles; responsive analog, no digital under analog
- **System info**: CPU and memory as % only
- Widget content centred across dashboard cards

---

## V2.1.026 — 03/07/2026

### Widget placement & themes menu

- **Auto-reflow** when placing a widget on an occupied cell — others shift instead of overlap errors
- **Click empty grid cells** in Edit dashboard to move the selected widget there
- Editor grid uses **fixed row heights** so visual size matches cell span (W×H)
- **Themes** moved under Settings (`/admin/themes`)

---

## V2.1.025 — 03/07/2026

### Activity log console

- Fixed-height **console-style** log panel with theme-aware colours
- Configurable **visible rows**; overflow scrolls inside the widget (dashboard no longer grows)
- MQTT relay state listener logs device activity (relay, mqtt, system, device events)
- Dashboard grid uses fixed row heights so widgets stay bounded

---

## V2.1.024 — 03/07/2026

### System info, activity log, appearance preview, grid guides, navigation

- **System info widget** — shows server RAM (not Node heap), CPU load/cores, and disk usage; removed host/timezone/platform
- **Activity log** — records sign-ins, devices, areas, automations, relay/MQTT commands, and widget changes
- **Appearance preview** — renders the actual selected widget with live style changes before Apply
- **Edit dashboard grid** — column letters (A, B, …) and row numbers with cell addresses on empty slots
- **Settings menu** — Admin renamed to Settings; Widget library moved under Settings
- **Add widget** — visual template gallery built into the picker (no separate library menu item)

---

## V2.1.023 — 03/07/2026

### Widget library, areas, automations, appearance UX

- **Widget library** now lists utility widgets (clock, calendar, weather, system info, log, network)
- **Rooms → Areas** in admin UI (rename areas, add Front Garden / Driveway, etc.)
- **Edit area** — rename and update description for existing locations
- **Automations** — dedicated builder (time, sensor, device, area triggers → relay actions)
- **Appearance** panel — live preview, visual chips for size/shape/style/chart, **Apply** button

---

## V2.1.022 — 03/07/2026

### Fix — build error + chart colours

- Fixed TypeScript error on `GENERIC_WIDGET_DEFAULTS` (`GenericWidgetType` with `as const`)
- Multi-sensor charts: **temperature** = light blue, **humidity** = light orange, **pressure** = light grey
- Single-sensor charts use the same colour rules

---

## V2.1.021 — 03/07/2026

### Widget customization & generic widgets

**Appearance (all widgets in Edit dashboard side panel)**
- Font size, shape, style variant, padding, border toggle
- Chart type: line, area, or bar (sensor / device widgets)
- Readings layout: stacked, 2/3-column grid, or inline (multi-sensor widgets)

**New generic widgets** (Add widget → Generic widgets)
- **Clock** — digital or analog
- **Calendar** — month view with today highlighted
- **Weather** — live conditions via Open-Meteo (set lat/lon; no API key)
- **System information** — version, uptime, memory, hostname
- **Activity log** — relay toggles, dashboard changes, filterable by category
- **Network status** — server IP(s) and all registered devices with online state

**Activity logging**
- New `activity_logs` table (auto-created on first use)
- Relay toggles and new widgets logged automatically

---

## V2.1.020 — 03/07/2026

### Sidebar & dashboard tab UX

- **Collapse menu**: hover no longer expands the sidebar; only the toggle button expands/collapses it
- **Customize tab** moved from the home top bar to **Admin → Edit dashboard**
- **Edit dashboard** tab strip now shows the same icons as the home dashboard

---

## V2.1.019 — 03/07/2026

### Fix — `/api/dashboard/layouts` 500 error

- API now **creates dashboard tables on demand** if they are missing (`ensure-dashboard-tables.ts`)
- Layouts list uses Prisma + raw SQL fallbacks for older schemas
- Docker image now includes `@prisma/client` so the startup schema script can run
- Manual migration `002_dashboard_widgets.sql` updated with `tab_icon` / `show_tab_label` columns

---

## V2.1.018 — 03/07/2026

### Fix — dashboard stuck on "Loading dashboard…"

- Layouts API falls back when `tab_icon` / `show_tab_label` columns are not migrated yet
- Dashboard loads via default layout endpoint if the tab list API fails
- Top tab bar shows loading / error / retry instead of staying empty
- Dashboard view no longer waits forever when `activeLayoutId` is missing

---

## V2.1.017 — 03/07/2026

### Fix — client crash after login

- **Theme customizer** in sidebar no longer nests `SheetTrigger` inside `SidebarMenuButton` tooltip (was causing a React/Radix client-side exception on every page)
- Added global **TooltipProvider** in `AppShell` for sidebar and tab tooltips

---

## V2.1.016 — 03/07/2026

### Top menu & sidebar cleanup

- **Collapse button** moved to the sidebar header (right of DAMN Home logo)
- Removed **+ New**, **Customize**, and **admin** username from the top bar
- **Theme customizer** moved to the vertical sidebar (Theme item)
- **Dashboard tabs** show a customizable icon per dashboard
- **Customize tab** popover: rename, pick icon from library (20 icons), toggle icon-only mode
- Database: `tab_icon` and `show_tab_label` on `dashboard_layouts` (auto-migrated on container start)

---

## V2.1.015 — 03/07/2026

### Docker build fix — DATABASE_URL at build time

- Marked DB-backed pages as `dynamic = "force-dynamic"` (home, admin layout, dashboard editor, library) so Next.js does not prerender them without a database
- Added placeholder `DATABASE_URL` in Dockerfile builder stage as a safety net during `next build`

---

## V2.1.014 — 03/07/2026

### Build fix — tsParticles v4 React API

- Replaced removed `initParticlesEngine` with `ParticlesProvider` (required in `@tsparticles/react` v4)
- Added `AppParticlesProvider` in root layout; `DashboardParticles` only renders the canvas

---

## V2.1.013 — 03/07/2026

### Build fix — remove invalid links package

- Removed `@tsparticles/plugin-links` (not published on npm)
- Network/link effects use `@tsparticles/slim`, which already includes the links interaction

---

## V2.1.012 — 03/07/2026

### Build fix — tsParticles versions

- Corrected npm packages: `@tsparticles/react`, `@tsparticles/slim`, `@tsparticles/engine` at **^4.2.1** (v3.9.1 does not exist on npm)
- Removed invalid `tsparticles@^3.9.1` umbrella package

---

## V2.1.011 — 03/07/2026

### Widget placement & overlap fixes

- **New widgets always go to A1** — existing widgets automatically shift to the next free grid cells
- **Auto-arrange widgets** button when overlaps are detected (fixes stacked widgets you cannot click)
- **Widget list** in the editor side panel — select any widget by name, even when covered
- Overlapping widgets highlighted with a red border; selected widget renders on top
- Cell field removed from “Add widget” form (placement is automatic)

### Dashboard background effects (tsParticles)

- **Theme Customizer → Background effects** — Snow, Stars, Bubbles, Network, Network (interactive)
- Powered by [tsParticles](https://particles.js.org/) (`@tsparticles/react` + slim bundle)
- Preference saved in `localStorage` (`ui-particles`)
- Effects render behind the dashboard shell (non-blocking; interactive mode uses window hover)

### Files added

- `apps/web/src/app/api/dashboard/layout/reflow/route.ts`
- `apps/web/src/components/effects/DashboardParticles.tsx`
- `apps/web/src/lib/particle-presets.ts`

### Dependencies

- `@tsparticles/react`, `@tsparticles/slim`, `@tsparticles/engine` (^4.2.1)

---

## V2.1.010 — 03/07/2026

### Optional combined device widget

- **All readings (one device)** — optional classic widget type in the editor (not the default)
- Puts temperature, humidity, pressure, etc. from the **same ESP32/device** in **one** card
- Combined chart available via **Show chart** (optional; separate single-sensor widgets still supported)
- Default when adding a widget remains **Single sensor**

---

## V2.1.009 — 03/07/2026

### Combined device widget (initial)

- Added `device_sensors` widget type, `DeviceSensorsWidget`, and `MultiSensorChart`
- Superseded by clearer optional UX in V2.1.010

---

## V2.1.008 — 03/07/2026

### Phase 3 — Widget library & live data binding

- **New widget type `library`** — dashboard widgets can use Dashtrans templates instead of only classic sensor/relay cards
- **Widget catalog** (`apps/web/src/library/widget-catalog.ts`) — 6 templates with descriptions, default grid size, and binding rules:
  - Gaussian stat card (sensor or relay)
  - Icon color widget (sensor)
  - Progress stat card (sensor — suited to humidity 0–100%)
  - Radial stat card (sensor)
  - Area history chart (24h InfluxDB history)
  - Line history chart (24h sparkline)
- **`LibraryWidget` component** — binds templates to live MQTT/Influx readings via existing `/api/readings/latest` and `/api/readings` APIs
- **Widget editor** — new **Library templates** tab alongside classic widgets; pick template, sensor/relay, cell, and size
- **`/library` page** — browse all templates with live previews and **Add to dashboard** link
- **Refactored chart cards** — `AreaStatsCard` and `WebsiteVisitorsCard` accept `title`, `value`, `subtitle`, and `data` props (demo data still used on library page)
- **Helper modules** — `library-bindings.ts` (value formatting, live status, history trends), `library-icons.ts` (sensor-type → Lucide icon)

### Files added

- `apps/web/src/components/dashboard/LibraryWidget.tsx`
- `apps/web/src/components/library/LibraryCatalogGrid.tsx`
- `apps/web/src/lib/library-bindings.ts`
- `apps/web/src/lib/library-icons.ts`

---

## V2.1.007 — 03/07/2026

### Readability fixes

- **Sensor charts** — axis labels, grid lines, and tooltips now use theme foreground colours (Recharts SVG text ignored Tailwind classes before)
- **Devices admin page** — headings, sensor/relay lists, and form labels use `text-foreground`
- **Form labels** (`.label` in `globals.css`) — changed from muted background tone to readable foreground
- **Select dropdowns** — `<option>` elements styled with background/foreground for dark and light themes
- **CHANGELOG** — initial version of this file at project root

---

## V2.1.006 — 03/07/2026

### Dashboard & theme UX

- **Room line on widgets** — shows room name only (e.g. `Living Room`), not `Living Room · Living Room ESP32`
- **Admin page text** — replaced incorrect `text-[var(--muted)]` (ShadCN muted is a *background* colour) with `text-muted-foreground`
- **Global body text** — `text-foreground` on `<body>` for consistent contrast
- **Theme Customizer** — moved from floating bottom-right ⚙ to header; Light/Dark toggle placed inside customizer above 6 Gaussian themes
- **Removed** separate Light/Dark button from top menu

---

## V2.1.005 — 03/07/2026

### Dashboard display bugs

- **Invisible widget text** — classic widgets used `--muted` as text colour; fixed to `text-muted-foreground` / `text-card-foreground`
- **Chart expansion** — "Show chart" no longer stretches all grid rows (`alignItems: start`, `self-start` on widget wrappers)

---

## V2.1.004 — 02/07/2026

### Build & compatibility (Next.js 16)

- Route `params` typed as `Promise` — `await params` in dynamic API routes
- `cookies()` is async — `await cookies()` in auth helpers
- Prisma JSON fields — explicit `Prisma.InputJsonValue` casts on widget updates
- Restored `slugify()` and `deviceSlugFromTopicPrefix()` in `lib/utils.ts`
- Added missing packages: `react-day-picker`, `cmdk`
- Tailwind v4 — removed invalid `@apply btn`; utility chains in `globals.css`

---

## V2.1.003 — 02/07/2026

### Dashtrans UI shell (Phase 2)

- **`AppShell`** — sidebar + header layout replacing old `NavBar` / `TopBar`
- **`damn-sidebar.tsx`** — Home, Admin (Devices, Rooms, Automations, Edit dashboard), Widget library, version badge
- **`damn-header.tsx`** — dashboard tabs, Customize link, Theme Customizer
- **View-only home** (`/`) and **editor** (`/admin/dashboard`) — Option B layout
- **CSS grid editor** — replaced `react-grid-layout` (removed dependency)
- **Widget library stub** at `/library` (expanded in V2.1.008)
- **Version generation** bumped to **2** (`V2.x.x`)

---

## V2.1.002 — 02/07/2026

### Stack upgrade

- **Next.js 16.1.6**, **React 19**, **Tailwind CSS v4**
- Copied **ShadCN UI** primitives from Dashtrans (`components/ui/` — 38 files)
- Copied **theme system** — `library/theme/`, `store/ui-theme.store.ts`, 6 Gaussian themes in `globals.css`
- Copied **widget templates** — `library/widgets/statistics/`, `library/widgets/data/` (presentational, not yet bound to live data)

---

## V2.1.001 — 02/07/2026

### Dashtrans migration start

- Approved path: Dashtrans template as UI shell + widget library; keep Theme Customizer and all backend APIs
- Preserved: Prisma schema, JWT auth (`damnhome_session`), MQTT pipeline, InfluxDB history, PostgreSQL devices/rooms

---

## V1.1.010 — 02/07/2026

### Option B — separate view and editor

- **Home (`/`)** — view-only dashboard (no edit chrome on widgets)
- **`/admin/dashboard`** — dedicated grid editor with side panel for widget settings
- **Customize** button on home top bar → editor
- **Sidebar** — "Edit dashboard" under Admin
- Used `react-grid-layout` for drag/resize (removed in V2)

---

## V1.1.009 — 02/07/2026

### Edit-mode stability

- Widget config merge fix — display element toggles persist correctly on PATCH
- Reduced overlapping edit overlays on dashboard grid

---

## V1.1.008 — 02/07/2026

### Editor fixes & API

- **Prisma JSON** cast on `PATCH /api/dashboard/widgets/[id]` — Docker build TypeScript fix
- Edit mode: compact widget preview, fixed row height, layout overlay with **Apply**
- Prevented chart expansion inside editor preview

---

## V1.1.007 — 02/07/2026

### Edit-mode overlap fixes

- Widget stacking / overlap issues in edit mode
- Chart button hidden in editor preview

---

## V1.1.006 — 02/07/2026

### Widget display customization

- Per-widget **visible elements** toggle: room line, title, value, status, chart button, device name
- Relay widgets default to title + value + status
- `WidgetDisplayEditor` component in dashboard editor side panel

---

## V1.1.005 — 02/07/2026

### Navigation & multi-dashboard

- **Left sidebar** — Home, Admin sections, version display
- **Top bar** — dashboard tabs, **+ New** dashboard, user menu
- **Version format VX.Y.Z** introduced (`apps/web/src/lib/version.ts`)
- Widget element picker in edit mode

---

## V1.1.004 — 02/07/2026

### Multi-dashboard support

- **`DashboardLayout`** and **`DashboardWidget`** Prisma models
- Multiple named dashboards per installation
- Active layout in browser `localStorage` (`damnhome-active-layout`)
- APIs: `GET/POST/PUT /api/dashboard/layout`, widget CRUD

---

## V1.1.003 — 02/07/2026

### Customizable dashboard

- Grid-based dashboard with widget types: `sensor`, `relay`, `room_sensors`, `device_status`
- Widget placement by cell address (e.g. `A1`) with column/row span
- Edit mode on home dashboard (later moved to `/admin/dashboard` in V1.1.010)

---

## V1.1.002 — 02/07/2026

### Live reading accuracy

- Fixed false **Online** status from retained MQTT messages
- **`isLive`** logic: non-retained MQTT with fresh timestamp, or Influx reading &lt; 120 seconds old
- Reading `source` field: `mqtt` | `influx` | `retained`

---

## V1.1.001 — 02/07/2026

### Initial release

- **Docker Compose** stack: Mosquitto, InfluxDB, PostgreSQL, Node-RED, Next.js, ESPHome
- **Web app**: login, dashboard, admin pages (Devices, Rooms, Automations)
- **Device registration** — MQTT topic prefix, ESPHome entity mapping, room assignment
- **Sensor history** — ESP32 → MQTT → Node-RED → InfluxDB; charts on sensor widgets
- **Relay control** — toggle via MQTT from dashboard
- **JWT session** cookie `damnhome_session`
- **ESPHome** dashboard link on Devices page (port 6052)
