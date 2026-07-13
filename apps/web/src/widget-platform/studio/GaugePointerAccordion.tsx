"use client";

import { useState } from "react";
import type { GaugeDesignConfig } from "@/widget-platform/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Circle, Minus, Rainbow, Trash2, Triangle } from "lucide-react";

export type PointerWithValue = NonNullable<GaugeDesignConfig["pointers"]>[number];

const POINTER_COLORS = ["#5BE12C", "#F5CD19", "#EA4228", "#60a5fa", "#a855f7"];

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
      <span className="w-12 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
      />
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {suffix ?? value}
      </span>
    </div>
  );
}

export function PointerAccordion({
  pointer,
  index,
  minValue,
  maxValue,
  isOnlyPointer,
  onUpdate,
  onRemove,
}: {
  pointer: PointerWithValue;
  index: number;
  minValue: number;
  maxValue: number;
  isOnlyPointer: boolean;
  onUpdate: (next: PointerWithValue) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const pointerType = pointer.type ?? "needle";

  return (
    <div className="overflow-hidden rounded-md border border-border/80 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/40"
      >
        <span
          className="h-3 w-3 shrink-0 rounded-sm border border-border/60"
          style={{ background: pointer.color ?? "#888" }}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {pointer.label || `Pointer ${index + 1}`}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {pointer.value.toFixed(1)}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 opacity-60 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/60 px-2 py-2">
          <div className="flex items-center gap-2">
            <span className="w-12 text-[10px] text-muted-foreground">Label</span>
            <input
              type="text"
              value={pointer.label ?? ""}
              placeholder={`Pointer ${index + 1}`}
              onChange={(e) => onUpdate({ ...pointer, label: e.target.value || undefined })}
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-0.5 text-xs"
            />
          </div>

          <RangeRow
            label="Value"
            value={pointer.value}
            min={minValue}
            max={maxValue}
            step={0.1}
            onChange={(v) => onUpdate({ ...pointer, value: v })}
            suffix={pointer.value.toFixed(1)}
          />

          <div className="flex items-center gap-2">
            <span className="w-12 text-[10px] text-muted-foreground">Type</span>
            <div className="flex gap-1">
              {(
                [
                  { type: "needle" as const, icon: <Minus className="h-3 w-3 -rotate-45" /> },
                  { type: "arrow" as const, icon: <Triangle className="h-3 w-3" /> },
                  { type: "blob" as const, icon: <Circle className="h-3 w-3" /> },
                ] as const
              ).map(({ type, icon }) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={pointerType === type ? "default" : "outline"}
                  className="h-7 px-2"
                  onClick={() => onUpdate({ ...pointer, type })}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-[10px] text-muted-foreground">Colour</span>
            <input
              type="color"
              value={pointer.color ?? "#888888"}
              onChange={(e) => onUpdate({ ...pointer, color: e.target.value })}
              className="h-7 w-9 rounded border border-border bg-transparent p-0"
            />
            <Button
              type="button"
              size="sm"
              variant={!pointer.color ? "default" : "outline"}
              className="h-7 px-2 text-[10px]"
              onClick={() => onUpdate({ ...pointer, color: undefined })}
            >
              <Rainbow className="mr-1 h-3 w-3" />
              Arc
            </Button>
            {pointerType === "needle" ? (
              <>
                <span className="text-[10px] text-muted-foreground">Base</span>
                <input
                  type="color"
                  value={pointer.baseColor ?? "#ffffff"}
                  onChange={(e) => onUpdate({ ...pointer, baseColor: e.target.value })}
                  className="h-7 w-9 rounded border border-border bg-transparent p-0"
                />
              </>
            ) : null}
          </div>

          {pointerType === "needle" ? (
            <>
              <RangeRow
                label="Length"
                value={pointer.length ?? 0.7}
                min={0.3}
                max={1.5}
                step={0.05}
                onChange={(v) => onUpdate({ ...pointer, length: v })}
              />
              <RangeRow
                label="Width"
                value={pointer.width ?? 8}
                min={1}
                max={40}
                step={1}
                onChange={(v) => onUpdate({ ...pointer, width: v })}
              />
            </>
          ) : null}

          {!isOnlyPointer ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-full text-[10px] text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remove
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function nextPointerColor(index: number): string {
  return POINTER_COLORS[index % POINTER_COLORS.length];
}

export function defaultPointerFromSandbox(
  sandbox: {
    minValue: number;
    maxValue: number;
    pointer?: GaugeDesignConfig["pointer"];
  },
  value: number
): PointerWithValue {
  const p = sandbox.pointer ?? {};
  return {
    value,
    type: p.type ?? "needle",
    color: p.color,
    baseColor: p.baseColor ?? "#ffffff",
    length: p.length ?? 0.7,
    width: p.width ?? 15,
  };
}

export function offsetPointerValue(min: number, max: number, base: number, ratio = 0.2): number {
  const span = max - min;
  let next = base + span * ratio;
  if (next > max) next = min + (next - max);
  return next;
}
