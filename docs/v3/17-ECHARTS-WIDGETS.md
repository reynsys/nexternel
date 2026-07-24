# Nexternel V3 — ECharts widgets

| Field | Value |
|-------|--------|
| **Version** | V3.1.033+ |
| **Code** | [`apps/ui/src/widgets/echarts/`](../../apps/ui/src/widgets/echarts/) |

## Purpose

Apache ECharts is the sole chart/gauge engine. Dashboard widgets use a **preset gallery** plus an **Edit drawer** (common fields + Advanced JSON) so any ECharts `option` property is reachable without shipping hundreds of form fields.

## Widget type

Persisted instance type: **`echarts`**

```ts
config: {
  presetId: string;           // e.g. "gauge-temperature"
  range?: "1h"|"6h"|"24h"|"7d";
  min?: number;
  max?: number;
  accent?: string;
  optionOverride?: object;    // deep-merged onto preset option
}
bindings: { capabilityId?: string }
```

Catalog keys are `echarts.<presetId>` (e.g. `echarts.gauge-ring`); Add widget creates `type: "echarts"`.

## Data modes

| Mode | Behaviour |
|------|-----------|
| `live` | Injects current capability numeric value |
| `history` | Loads Influx history via History API into series |
| `none` | Blank / Advanced JSON only (no capability) |

Bound `series[].data` is preserved when applying `optionOverride` unless the override sets `data` explicitly.

## Presets (first ship)

**Sensors (gauges):** `gauge`, `gauge-simple`, `gauge-speed`, `gauge-progress`, `gauge-stage`, `gauge-grade`, `gauge-multi-title`, `gauge-temperature`, `gauge-ring`, `gauge-barometer`, `gauge-clock`, `gauge-car` — ported from [official ECharts gauge examples](https://echarts.apache.org/examples/en/index.html#chart-type-gauge). **All** gauge series pass through `enforceAllGaugeSeries` (nice ticks, axis label formatter, radius/center clamp) plus shared `gaugeLayout` placements.

**Sensors (other):** `pie-basic`, `pie-doughnut`, `radar-basic`, `funnel-basic`

**History:** `line-basic`, `line-smooth`, `area-basic`, `area-stack`, `bar-basic`, `bar-horizontal`, `scatter-basic`, `pie-rose`, `heatmap-basic`

**System:** `blank`

## Edit drawer

In dashboard **Edit** mode, ECharts widgets show **Edit** → drawer with:

1. Preset (filter by family)
2. Title, capability, min/max, accent, history range
3. Advanced JSON (`optionOverride`)
4. Live preview

## Migration

| Legacy | Becomes |
|--------|---------|
| `type: "gauge"`, `gaugeStyle: thermometer\|ring\|dial\|progress` | `echarts` + `gauge-temperature` / `gauge-ring` / `gauge` / `gauge-progress` |
| `type: "history"` | `echarts` + `line-basic` (keeps `range`) |

Migration runs in `normalizeDocument` and again at render time.

## Adding presets

1. Add a factory to `presets/gauges.ts` or `presets/charts.ts`
2. It is auto-registered via `registry.ts` and appears in the catalog

See also [16-WIDGET-CATALOG.md](16-WIDGET-CATALOG.md).
