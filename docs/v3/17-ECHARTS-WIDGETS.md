# Nexternel V3 — ECharts widgets

| Field | Value |
|-------|--------|
| **Version** | V3.1.043+ |
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

## Classification

Two layers (aligned with [Apache ECharts chart types](https://echarts.apache.org/examples/en/index.html)):

| Layer | Meaning |
|-------|---------|
| **Catalog category** | Where you **add** the widget: Sensors / Charts (history) / System |
| **ECharts family** | Series type: Gauge, Line, Area, Bar, Pie, Scatter, Radar, Funnel, Heatmap, Custom |

**Edit drawer scope** (locked to the component you opened):

| You edit… | You can change to… |
|-----------|-------------------|
| A gauge | Other **gauge** styles only |
| A history chart | Other **history** chart types (line/area/bar/…) — not gauges |
| Pie / radar / funnel | Other live diagrams in that group |
| Blank | Custom / Advanced JSON |

To switch from a gauge to a line chart (or the reverse), **Add** a new widget in the right category — Edit does not cross those groups.

## Data modes

| Mode | Behaviour |
|------|-----------|
| `live` | Injects current capability numeric value |
| `history` | Loads Influx history via History API into series |
| `none` | Blank / Advanced JSON only (no capability) |

Bound `series[].data` is preserved when applying `optionOverride` unless the override sets `data` explicitly.

## Presets

**Sensors (gauges):** `gauge`, `gauge-simple`, `gauge-speed`, `gauge-progress`, `gauge-stage`, `gauge-grade`, `gauge-multi-title`, `gauge-temperature`, `gauge-ring`, `gauge-barometer`, `gauge-clock`, `gauge-car` — ported from [official ECharts gauge examples](https://echarts.apache.org/examples/en/index.html#chart-type-gauge).

**Sensors (diagrams):** `pie-basic`, `pie-doughnut`, `radar-basic`, `funnel-basic`

**Charts (history):** line (basic / smooth / step / symbols / dashed / mark / end-label), area (filled / gradient / stack), bar (vertical / rounded / horizontal / stack), `scatter-basic`, `heatmap-basic`, `pie-rose`

**System:** `blank`

Apache’s public gallery has dozens of *demo pages* (multi-series sample datasets). Nexternel ships **sensor-bound presets** that work with one live/history capability — not every demo URL.

## Axis behaviour (V3.1.115+)

| Setting | Behaviour |
|---------|-----------|
| History range `1h` / `6h` / `24h` | X labels are clock time only (`HH:mm`) — no year |
| History range `7d` | Day + month labels (no bare year ticks) |
| Min / Max | Applied to the value axis on history charts and gauges |

## Edit drawer

In dashboard **Edit** mode, ECharts widgets show **Edit** → drawer with:

1. Component / chart type (only families in the current edit scope)
2. Preset / gauge style
3. Title, capability, min/max, accent, history range
4. Advanced JSON (`optionOverride`)
5. Live preview

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
