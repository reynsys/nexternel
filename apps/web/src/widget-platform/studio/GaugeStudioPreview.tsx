"use client";

import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import type { DashboardWidgetDto } from "@/types/dashboard";
import type { GaugePlatformInstance } from "@/widget-platform/types";
import {
  defaultSandboxMidpoint,
  platformFromGaugeTypeChange,
  patchSandboxValueRange,
  platformFromPreset,
  platformToSandboxConfig,
  type GaugeSandboxConfig,
} from "@/widget-platform/studio/gauge-sandbox-bridge";
import { GaugeStudioDial } from "@/widget-platform/studio/GaugeStudioDial";
import { GaugeTypeSelector } from "@/widget-platform/studio/GaugeTypeSelector";
import {
  copyGaugeStudioJsx,
  pasteGaugeStudio,
} from "@/widget-platform/studio/gauge-studio-clipboard";
import { GAUGE_PRESET_CATALOG } from "@/widget-platform/definitions/gauge/presets";
import { sensorIdFromBinding } from "@/widget-platform/types";
import { cn } from "@/lib/utils";
import { Check, ClipboardPaste, Copy, Hand, Shuffle, Sliders } from "lucide-react";

class StudioDialErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GaugeStudio] Live preview", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
          Preview unavailable — adjust min/max or pick another preset
        </div>
      );
    }
    return this.props.children;
  }
}

export function GaugeStudioPreview({
  widget,
  label,
  title,
  onTitleChange,
  platformDraft,
  onPlatformChange,
  sandbox,
  onSandboxChange,
  catalog,
  previewValue,
  onPreviewValueChange,
  showWidgetFrame,
  onShowWidgetFrameChange,
  autoAnimate,
  onAutoAnimateChange,
}: {
  widget: DashboardWidgetDto;
  label: string;
  title: string;
  onTitleChange: (t: string) => void;
  platformDraft: GaugePlatformInstance;
  onPlatformChange: (next: GaugePlatformInstance) => void;
  sandbox: GaugeSandboxConfig;
  onSandboxChange: (next: GaugeSandboxConfig) => void;
  catalog: DashboardCatalog;
  previewValue: number;
  onPreviewValueChange: (v: number) => void;
  showWidgetFrame: boolean;
  onShowWidgetFrameChange: (v: boolean) => void;
  autoAnimate: boolean;
  onAutoAnimateChange: (v: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [interactionEnabled, setInteractionEnabled] = useState(true);
  const [dialGeneration, setDialGeneration] = useState(0);

  async function handleCopy() {
    const ok = await copyGaugeStudioJsx(sandbox, previewValue);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handlePaste() {
    const data = await pasteGaugeStudio(platformDraft);
    if (!data) return;
    onPlatformChange(data.platform);
    if (data.previewValue !== undefined) {
      onPreviewValueChange(data.previewValue);
    }
  }

  function handleRandomize() {
    const preset = GAUGE_PRESET_CATALOG[Math.floor(Math.random() * GAUGE_PRESET_CATALOG.length)];
    onPlatformChange(platformFromPreset(preset.id, platformDraft));
    const mid = defaultSandboxMidpoint({
      type: preset.design.gaugeType ?? "semicircle",
      minValue: preset.defaultMin,
      maxValue: preset.defaultMax,
    });
    const span = preset.defaultMax - preset.defaultMin;
    onPreviewValueChange(mid + (Math.random() - 0.5) * span * 0.3);
  }

  function handlePointerDrag(index: number, newValue: number) {
    if (sandbox.pointers?.length) {
      const pointers = sandbox.pointers.map((p, i) =>
        i === index ? { ...p, value: newValue } : p
      );
      onSandboxChange({ ...sandbox, pointers });
      if (index === 0) onPreviewValueChange(newValue);
      return;
    }
    if (index === 0) onPreviewValueChange(newValue);
  }

  const step = Math.max(0.1, (sandbox.maxValue - sandbox.minValue) / 200);
  const sensorId = sensorIdFromBinding(platformDraft.binding);
  const sensor = sensorId ? catalog.sensors.find((s) => s.id === sensorId) : undefined;
  const unit = sensor?.unit ?? platformDraft.format?.unit ?? null;

  return (
    <div className="gauge-studio-preview-column flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden">
      <div className="gauge-studio-preview-card relative mx-auto flex w-full max-w-[400px] shrink-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg">
        {showWidgetFrame ? (
          <div className="shrink-0 border-b border-border/60 px-2 py-1">
            <input
              type="text"
              className="w-full bg-transparent text-[10px] font-medium outline-none"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={label}
            />
          </div>
        ) : null}

        <div className="gauge-studio-dial-slot relative min-h-0 w-full flex-1">
          <StudioDialErrorBoundary>
            <GaugeStudioDial
              key={`${platformDraft.presetId}-${sandbox.type}-${dialGeneration}`}
              remountKey={`${platformDraft.presetId}-${sandbox.type}-${dialGeneration}`}
              instance={platformDraft}
              previewValue={previewValue}
              unit={unit}
              interactionEnabled={interactionEnabled}
              onValueChange={(v) => {
                onPreviewValueChange(v);
                if (autoAnimate) onAutoAnimateChange(false);
              }}
              onPointerChange={handlePointerDrag}
              className="h-full min-h-0"
            />
          </StudioDialErrorBoundary>
        </div>

        <div className="gauge-studio-preview-actions flex shrink-0 items-center justify-center gap-1 border-t border-border/50 bg-muted/40 px-2 py-1">
          <PreviewAction icon={<Shuffle className="h-3.5 w-3.5" />} label="Random" onClick={handleRandomize} />
          <PreviewAction icon={<ClipboardPaste className="h-3.5 w-3.5" />} label="Paste" onClick={handlePaste} />
          <PreviewAction
            icon={copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            label={copied ? "Copied!" : "Copy"}
            onClick={handleCopy}
            active={copied}
            title="Copy as JSX"
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[400px] space-y-2 rounded-lg border border-border/60 bg-muted/25 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sliders className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={sandbox.minValue}
            max={sandbox.maxValue}
            step={step}
            value={previewValue}
            onChange={(e) => {
              const v = Number(e.target.value);
              onPreviewValueChange(v);
              if (autoAnimate) onAutoAnimateChange(false);
              if (sandbox.pointers?.length) {
                onSandboxChange({
                  ...sandbox,
                  pointers: sandbox.pointers.map((p, i) =>
                    i === 0 ? { ...p, value: v } : p
                  ),
                });
              }
            }}
            className="min-w-[6rem] flex-1"
          />
          <span className="min-w-[2.75rem] text-right text-sm font-bold tabular-nums text-primary">
            {previewValue.toFixed(1)}
          </span>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={autoAnimate}
              onChange={(e) => onAutoAnimateChange(e.target.checked)}
            />
            Auto
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Min</span>
          <input
            type="number"
            className="w-14 rounded-md border border-input bg-background px-1.5 py-0.5 text-center text-sm"
            value={sandbox.minValue}
            onChange={(e) => {
              const min = Number(e.target.value);
              const next = patchSandboxValueRange(sandbox, { minValue: min });
              onSandboxChange(next);
              if (previewValue < min) onPreviewValueChange(min);
            }}
          />
          <span className="text-muted-foreground">Max</span>
          <input
            type="number"
            className="w-14 rounded-md border border-input bg-background px-1.5 py-0.5 text-center text-sm"
            value={sandbox.maxValue}
            onChange={(e) => {
              const max = Number(e.target.value);
              const next = patchSandboxValueRange(sandbox, { maxValue: max });
              onSandboxChange(next);
              if (previewValue > max) onPreviewValueChange(max);
            }}
          />
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={showWidgetFrame}
              onChange={(e) => onShowWidgetFrameChange(e.target.checked)}
            />
            Frame
          </label>
          <label
            className="flex cursor-pointer items-center gap-1.5 text-muted-foreground"
            title="Drag the needle on the preview dial"
          >
            <Hand className="h-3.5 w-3.5" />
            <input
              type="checkbox"
              checked={interactionEnabled}
              onChange={(e) => setInteractionEnabled(e.target.checked)}
            />
            Drag
          </label>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[400px]">
        <GaugeTypeSelector
          value={sandbox.type}
          onChange={(type) => {
            if (type === sandbox.type) return;
            const next = platformFromGaugeTypeChange(sandbox, platformDraft, type);
            const nextSandbox = platformToSandboxConfig(next);
            onPlatformChange(next);
            onPreviewValueChange(defaultSandboxMidpoint(nextSandbox));
            setDialGeneration((g) => g + 1);
          }}
        />
      </div>
    </div>
  );
}

function PreviewAction({
  icon,
  label,
  onClick,
  active,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        active && "text-emerald-600"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
