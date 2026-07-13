"use client";

import type { GaugePlatformInstance, GaugeTypeId } from "@/widget-platform/types";
import { sensorIdFromBinding } from "@/widget-platform/types";
import { type GaugeSandboxConfig } from "@/widget-platform/studio/gauge-sandbox-bridge";
import { GAUGE_PRESET_CATALOG } from "@/widget-platform/definitions/gauge/presets";
import { GAUGE_COLOR_PRESETS, TICK_INTERVALS } from "@/widget-platform/studio/gauge-color-presets";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  Palette,
  Plus,
  Ruler,
  Sparkles,
  Tag,
  Target,
} from "lucide-react";
import {
  PointerAccordion,
  defaultPointerFromSandbox,
  nextPointerColor,
  offsetPointerValue,
  type PointerWithValue,
} from "@/widget-platform/studio/GaugePointerAccordion";

interface SensorOption {
  id: string;
  name: string;
  deviceName: string;
}

function defaultAngles(type: GaugeTypeId): { start: number; end: number } {
  if (type === "radial") return { start: -130, end: 130 };
  if (type === "grafana") return { start: -112, end: 112 };
  return { start: -90, end: 90 };
}

function StudioSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border border-border bg-card/50">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-muted/40">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform [[data-state=open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border px-3 py-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
      />
      <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {suffix ?? value}
      </span>
    </div>
  );
}

export function GaugeSandboxToolbar({
  sandbox,
  onSandboxChange,
  instance,
  onInstanceChange,
  sensors,
  previewValue,
  onPreviewValueChange,
}: {
  sandbox: GaugeSandboxConfig;
  onSandboxChange: (next: GaugeSandboxConfig) => void;
  instance: GaugePlatformInstance;
  onInstanceChange: (next: GaugePlatformInstance) => void;
  sensors: SensorOption[];
  previewValue: number;
  onPreviewValueChange: (v: number) => void;
}) {
  const arc = sandbox.arc ?? {};
  const pointer = sandbox.pointer ?? {};
  const valueLabel = sandbox.labels?.valueLabel ?? {};
  const tickLabels = sandbox.labels?.tickLabels ?? {};
  const angles = defaultAngles(sandbox.type);

  const patchSandbox = (patch: Partial<GaugeSandboxConfig>) => {
    onSandboxChange({ ...sandbox, ...patch });
  };

  const patchArc = (patch: NonNullable<GaugeSandboxConfig["arc"]>) => {
    onSandboxChange({ ...sandbox, arc: { ...arc, ...patch } });
  };

  const patchPointer = (patch: NonNullable<GaugeSandboxConfig["pointer"]>) => {
    onSandboxChange({
      ...sandbox,
      pointers: undefined,
      pointer: { ...pointer, ...patch },
    });
  };

  const patchLabels = (patch: NonNullable<GaugeSandboxConfig["labels"]>) => {
    onSandboxChange({
      ...sandbox,
      labels: {
        valueLabel: { ...valueLabel, ...patch.valueLabel },
        tickLabels: { ...tickLabels, ...patch.tickLabels },
      },
    });
  };

  const colors = arc.colorArray ?? ["#5BE12C", "#F5CD19", "#EA4228"];

  const pointerList: PointerWithValue[] = sandbox.pointers?.length
    ? sandbox.pointers
    : [
        defaultPointerFromSandbox(sandbox, previewValue),
      ];

  const multiPointer = (sandbox.pointers?.length ?? 0) > 0;

  function setPointers(pointers: PointerWithValue[]) {
    onSandboxChange({
      ...sandbox,
      pointers,
      pointer: undefined,
    });
    if (pointers[0]) onPreviewValueChange(pointers[0].value);
  }

  function updatePointerAt(index: number, updated: PointerWithValue) {
    if (multiPointer) {
      const pointers = [...(sandbox.pointers ?? [])];
      pointers[index] = updated;
      setPointers(pointers);
      return;
    }
    onPreviewValueChange(updated.value);
    onSandboxChange({
      ...sandbox,
      pointers: undefined,
      pointer: {
        ...pointer,
        type: updated.type,
        color: updated.color,
        baseColor: updated.baseColor,
        length: updated.length,
        width: updated.width,
      },
    });
  }

  function addPointer() {
    const min = sandbox.minValue;
    const max = sandbox.maxValue;
    if (!multiPointer) {
      const first = defaultPointerFromSandbox(sandbox, previewValue);
      const second: PointerWithValue = {
        ...defaultPointerFromSandbox(sandbox, offsetPointerValue(min, max, previewValue)),
        color: nextPointerColor(1),
      };
      setPointers([first, second]);
      return;
    }
    const current = sandbox.pointers ?? [];
    const last = current[current.length - 1];
    const next: PointerWithValue = {
      ...(last ?? defaultPointerFromSandbox(sandbox, previewValue)),
      value: offsetPointerValue(min, max, last?.value ?? previewValue),
      color: nextPointerColor(current.length),
      label: undefined,
    };
    setPointers([...current, next]);
  }

  function removePointerAt(index: number) {
    const current = sandbox.pointers ?? [];
    if (current.length <= 1) {
      const solo = current[0] ?? defaultPointerFromSandbox(sandbox, previewValue);
      onSandboxChange({
        ...sandbox,
        pointers: undefined,
        pointer: {
          type: solo.type,
          color: solo.color,
          baseColor: solo.baseColor,
          length: solo.length,
          width: solo.width,
        },
      });
      onPreviewValueChange(solo.value);
      return;
    }
    const next = current.filter((_, i) => i !== index);
    setPointers(next);
  }

  return (
    <div className="gauge-studio-toolbar-grid grid h-full min-h-0 w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div className="gauge-studio-tool-column space-y-3">
        <StudioSection title="Gallery presets" icon={<Palette className="h-4 w-4" />} defaultOpen={false}>
          <p className="text-xs text-muted-foreground">
            All {GAUGE_PRESET_CATALOG.length} react-gauge-component gallery presets are in the
            scrollable <span className="font-medium text-foreground">Gauge Gallery</span> below —
            use the pencil icon to load one into the editor.
          </p>
        </StudioSection>

        <StudioSection title="Arc & colours" icon={<Layers className="h-4 w-4" />}>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground">Palettes</span>
            {GAUGE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                title={preset.label}
                onClick={() =>
                  patchArc({
                    colorArray: [...preset.colors],
                    nbSubArcs: preset.colors.length,
                    subArcs: [],
                  })
                }
                className="flex gap-px rounded border border-border p-0.5 hover:bg-muted/50"
              >
                {preset.colors.map((c, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-sm"
                    style={{ background: c }}
                  />
                ))}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {[3, 10, 50, 100].map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={arc.nbSubArcs === n ? "default" : "outline"}
                onClick={() => patchArc({ nbSubArcs: n, subArcs: [] })}
              >
                {n} arcs
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={arc.gradient ?? false}
              onChange={(e) => patchArc({ gradient: e.target.checked })}
            />
            Gradient blend
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((color, i) => (
              <input
                key={i}
                type="color"
                value={color}
                title={`Colour ${i + 1}`}
                onChange={(e) => {
                  const next = [...colors];
                  next[i] = e.target.value;
                  patchArc({ colorArray: next, nbSubArcs: next.length, subArcs: [] });
                }}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                patchArc({
                  colorArray: [...colors, "#888888"],
                  nbSubArcs: colors.length + 1,
                  subArcs: [],
                })
              }
            >
              +
            </Button>
          </div>
          <RangeRow
            label="Width"
            value={arc.width ?? 0.2}
            min={0.05}
            max={0.6}
            step={0.01}
            onChange={(v) => patchArc({ width: v })}
          />
          <RangeRow
            label="Corner"
            value={arc.cornerRadius ?? 7}
            min={0}
            max={50}
            step={1}
            onChange={(v) => patchArc({ cornerRadius: v })}
          />
          <RangeRow
            label="Padding"
            value={arc.padding ?? 0.05}
            min={0}
            max={0.25}
            step={0.005}
            onChange={(v) => patchArc({ padding: v })}
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={arc.padEndpoints !== false}
              onChange={(e) => patchArc({ padEndpoints: e.target.checked })}
            />
            Pad arc endpoints
          </label>
          {sandbox.type === "grafana" ? (
            <label className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Empty arc</span>
              <input
                type="color"
                value={arc.emptyColor ?? "#5C5C5C"}
                onChange={(e) => patchArc({ emptyColor: e.target.value })}
                className="h-8 w-10 rounded border border-border"
              />
            </label>
          ) : null}
        </StudioSection>

        <StudioSection title="Angles" icon={<Sparkles className="h-4 w-4" />} defaultOpen={false}>
          <RangeRow
            label="Start"
            value={sandbox.startAngle ?? angles.start}
            min={-180}
            max={180}
            step={5}
            onChange={(v) => patchSandbox({ startAngle: v })}
            suffix={`${sandbox.startAngle ?? angles.start}°`}
          />
          <RangeRow
            label="End"
            value={sandbox.endAngle ?? angles.end}
            min={-180}
            max={180}
            step={5}
            onChange={(v) => patchSandbox({ endAngle: v })}
            suffix={`${sandbox.endAngle ?? angles.end}°`}
          />
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patchSandbox({ startAngle: -90, endAngle: 90 })}
            >
              Half
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patchSandbox({ startAngle: -135, endAngle: 135 })}
            >
              ¾
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patchSandbox({ startAngle: undefined, endAngle: undefined })}
            >
              Reset
            </Button>
          </div>
        </StudioSection>

        <StudioSection title="Effects" icon={<Sparkles className="h-4 w-4" />} defaultOpen={false}>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={arc.effects?.glow ?? false}
              onChange={(e) =>
                patchArc({
                  effects: { ...arc.effects, glow: e.target.checked },
                })
              }
            />
            Glow
          </label>
          {arc.effects?.glow ? (
            <>
              <RangeRow
                label="Blur"
                value={arc.effects?.glowBlur ?? 10}
                min={1}
                max={30}
                step={1}
                onChange={(v) =>
                  patchArc({ effects: { ...arc.effects, glow: true, glowBlur: v } })
                }
              />
              <RangeRow
                label="Spread"
                value={arc.effects?.glowSpread ?? 1}
                min={0}
                max={3}
                step={0.1}
                onChange={(v) =>
                  patchArc({ effects: { ...arc.effects, glow: true, glowSpread: v } })
                }
              />
            </>
          ) : null}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={arc.effects?.innerShadow ?? false}
              onChange={(e) =>
                patchArc({
                  effects: { ...arc.effects, innerShadow: e.target.checked },
                })
              }
            />
            Inner shadow (3D)
          </label>
        </StudioSection>
      </div>

      <div className="gauge-studio-tool-column space-y-3">
        <StudioSection title="Pointers" icon={<Target className="h-4 w-4" />}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {pointerList.length} pointer{pointerList.length === 1 ? "" : "s"}
            </span>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addPointer}>
              <Plus className="mr-1 h-3 w-3" />
              Add pointer
            </Button>
          </div>

          <div className="space-y-2">
            {pointerList.map((ptr, index) => (
              <PointerAccordion
                key={index}
                pointer={ptr}
                index={index}
                minValue={sandbox.minValue}
                maxValue={sandbox.maxValue}
                isOnlyPointer={!multiPointer && pointerList.length === 1}
                onUpdate={(updated) => updatePointerAt(index, updated)}
                onRemove={() => removePointerAt(index)}
              />
            ))}
          </div>

          {!multiPointer ? (
            <>
              <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
                {(["needle", "blob", "arrow"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={pointer.type === t ? "default" : "outline"}
                    onClick={() => patchPointer({ type: t })}
                  >
                    {t}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={pointer.hide ? "default" : "outline"}
                  onClick={() => patchPointer({ hide: !pointer.hide })}
                >
                  {pointer.hide ? "Hidden" : "Visible"}
                </Button>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={pointer.elastic ?? false}
                  onChange={(e) => patchPointer({ elastic: e.target.checked })}
                />
                Elastic animation
              </label>
              <RangeRow
                label="Anim ms"
                value={pointer.animationDuration ?? 400}
                min={0}
                max={3000}
                step={50}
                onChange={(v) => patchPointer({ animationDuration: v })}
              />
            </>
          ) : null}
        </StudioSection>
      </div>

      <div className="gauge-studio-tool-column space-y-3 md:col-span-2 xl:col-span-1">
        <StudioSection title="Value label" icon={<Tag className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant={valueLabel.hide ? "outline" : "default"}
              onClick={() => patchLabels({ valueLabel: { hide: !valueLabel.hide } })}
            >
              {valueLabel.hide ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span className="ml-1">{valueLabel.hide ? "Hidden" : "Shown"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={valueLabel.matchColorWithArc ? "default" : "outline"}
              onClick={() =>
                patchLabels({
                  valueLabel: { matchColorWithArc: !valueLabel.matchColorWithArc },
                })
              }
            >
              Match arc
            </Button>
          </div>
          <RangeRow
            label="Size"
            value={parseInt(valueLabel.fontSize ?? "18", 10) || 18}
            min={10}
            max={48}
            step={1}
            onChange={(v) =>
              patchLabels({ valueLabel: { fontSize: `${v}px`, hide: false } })
            }
            suffix="px"
          />
          <RangeRow
            label="Offset Y"
            value={valueLabel.offsetY ?? 0}
            min={-80}
            max={80}
            step={1}
            onChange={(v) => patchLabels({ valueLabel: { offsetY: v } })}
          />
        </StudioSection>

        <StudioSection title="Tick marks" icon={<Ruler className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1">
            {TICK_INTERVALS.map((t) => (
              <Button
                key={t.label}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const min = sandbox.minValue;
                  const max = sandbox.maxValue;
                  const tickValues =
                    t.interval === 0
                      ? undefined
                      : Array.from(
                          { length: Math.floor((max - min) / t.interval) + 1 },
                          (_, i) => min + i * t.interval
                        );
                  patchLabels({
                    tickLabels: {
                      tickValues,
                      hideMinMax: t.interval === 0,
                      type: tickLabels.type ?? "outer",
                    },
                  });
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={tickLabels.type === "inner" ? "default" : "outline"}
              onClick={() => patchLabels({ tickLabels: { type: "inner" } })}
            >
              Inner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tickLabels.type !== "inner" ? "default" : "outline"}
              onClick={() => patchLabels({ tickLabels: { type: "outer" } })}
            >
              Outer
            </Button>
          </div>
        </StudioSection>

        <StudioSection title="Dashboard binding" icon={<Tag className="h-4 w-4" />} defaultOpen={false}>
          <label className="text-xs">
            <span className="text-muted-foreground">Sensor</span>
            <select
              className="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={sensorIdFromBinding(instance.binding) ?? ""}
              onChange={(e) => {
                const sensorId = e.target.value;
                onInstanceChange({
                  ...instance,
                  binding: sensorId ? { kind: "sensor", sensorId } : { kind: "none" },
                });
              }}
            >
              <option value="">Preview only (no sensor)</option>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.deviceName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Unit suffix</span>
            <input
              type="text"
              className="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              placeholder="°C, %, Mbps…"
              value={instance.format?.unit ?? ""}
              onChange={(e) =>
                onInstanceChange({
                  ...instance,
                  format: { ...instance.format, unit: e.target.value || undefined },
                })
              }
            />
          </label>
        </StudioSection>
      </div>
    </div>
  );
}
