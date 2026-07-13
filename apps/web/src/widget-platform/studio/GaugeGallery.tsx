"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useState } from "react";
import type { GaugeGalleryPresetMeta } from "@/widget-platform/definitions/gauge/gauge-gallery-catalog";
import { GAUGE_GALLERY_CATALOG } from "@/widget-platform/definitions/gauge/gauge-gallery-catalog";
import { GaugePrimitive } from "@/widget-platform/renderer/GaugePrimitive";
import {
  buildGalleryGaugeProps,
  galleryPresetMidpoint,
  GALLERY_GRID_HEIGHTS,
} from "@/widget-platform/studio/gauge-gallery-props";
import { copyGaugeStudioJsx } from "@/widget-platform/studio/gauge-studio-clipboard";
import {
  platformToSandboxConfig,
  type GaugeSandboxConfig,
} from "@/widget-platform/studio/gauge-sandbox-bridge";
import type { GaugePlatformInstance } from "@/widget-platform/types";
import { cn } from "@/lib/utils";
import { Check, Copy, Pencil } from "lucide-react";

type ColumnCount = 1 | 2 | 3 | 4;

function tempPlatform(presetId: string, existing: GaugePlatformInstance): GaugePlatformInstance {
  return { ...existing, presetId, design: {} };
}

class GaugeGalleryCardErrorBoundary extends Component<
  { name: string; resetKey: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[GaugeGallery] ${this.props.name}`, error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex flex-1 items-center justify-center p-3 text-center text-[11px] text-muted-foreground">
          Preview unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

export function GaugeGallery({
  autoAnimate,
  activePresetId,
  platformDraft,
  onApplyPreset,
}: {
  autoAnimate: boolean;
  activePresetId?: string;
  platformDraft: GaugePlatformInstance;
  onApplyPreset: (presetId: string, previewValue: number) => void;
}) {
  const [columnCount, setColumnCount] = useState<ColumnCount>(4);
  const [mountedCount, setMountedCount] = useState(0);
  const [values, setValues] = useState<number[]>(() =>
    GAUGE_GALLERY_CATALOG.map((p) => galleryPresetMidpoint(p))
  );

  useEffect(() => {
    let frame = 0;
    let count = 0;
    const step = () => {
      count += 1;
      setMountedCount(count);
      if (count < GAUGE_GALLERY_CATALOG.length) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!autoAnimate) return;

    const STAGGER_DELAY = 100;
    const CYCLE_INTERVAL = 4000;
    const BATCH_SIZE = 4;
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      const batches = Math.ceil(GAUGE_GALLERY_CATALOG.length / BATCH_SIZE);

      for (let batch = 0; batch < batches; batch++) {
        const timeout = setTimeout(() => {
          setValues((prev) => {
            const next = [...prev];
            const start = batch * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, GAUGE_GALLERY_CATALOG.length);
            for (let i = start; i < end; i++) {
              const preset = GAUGE_GALLERY_CATALOG[i];
              const span = preset.defaultMax - preset.defaultMin;
              next[i] = preset.defaultMin + Math.random() * span;
            }
            return next;
          });
        }, batch * STAGGER_DELAY);
        timeouts.push(timeout);
      }
    };

    runCycle();
    const interval = setInterval(runCycle, CYCLE_INTERVAL);
    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, [autoAnimate]);

  const cardHeight = GALLERY_GRID_HEIGHTS[columnCount];

  return (
    <section className="gauge-gallery-section w-full min-w-0 border-t border-border/60 pt-4">
      <div className="gauge-gallery-header mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Gauge Gallery</h2>
        <div className="gauge-gallery-column-controls flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {([1, 2, 3, 4] as ColumnCount[]).map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setColumnCount(count)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                columnCount === count
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {count}×
            </button>
          ))}
        </div>
      </div>

      <div
        className="gauge-gallery-grid grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {GAUGE_GALLERY_CATALOG.map((preset, index) => (
          <GaugeGalleryCard
            key={preset.id}
            preset={preset}
            value={values[index]}
            cardHeight={cardHeight}
            active={activePresetId === preset.id}
            platformDraft={platformDraft}
            dialReady={index < mountedCount}
            onApply={() => onApplyPreset(preset.id, values[index])}
          />
        ))}
      </div>
    </section>
  );
}

function GaugeGalleryCard({
  preset,
  value,
  cardHeight,
  active,
  platformDraft,
  dialReady,
  onApply,
}: {
  preset: GaugeGalleryPresetMeta;
  value: number;
  cardHeight: string;
  active: boolean;
  platformDraft: GaugePlatformInstance;
  dialReady: boolean;
  onApply: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const gaugeProps = useMemo(() => {
    try {
      return buildGalleryGaugeProps(preset, value);
    } catch (err) {
      console.error(`[GaugeGallery] props failed for ${preset.id}`, err);
      return buildGalleryGaugeProps(
        GAUGE_GALLERY_CATALOG[0],
        galleryPresetMidpoint(GAUGE_GALLERY_CATALOG[0])
      );
    }
  }, [preset, value]);

  async function handleCopy() {
    const sandbox: GaugeSandboxConfig = platformToSandboxConfig(
      tempPlatform(preset.id, platformDraft)
    );
    const ok = await copyGaugeStudioJsx(sandbox, value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <article
      className={cn(
        "gauge-gallery-card relative flex flex-col overflow-hidden rounded-xl border bg-card/80 shadow-sm",
        active ? "border-primary ring-1 ring-primary/30" : "border-border/70"
      )}
      style={{ height: cardHeight, maxHeight: cardHeight }}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          title="Send to editor"
          onClick={onApply}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/90 text-primary-foreground shadow hover:bg-primary"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Copy as JSX"
          onClick={handleCopy}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md shadow",
            copied ? "bg-emerald-500 text-white" : "bg-black/50 text-white hover:bg-black/70"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="shrink-0 px-3 pt-3 pr-16">
        <h3 className="text-sm font-semibold leading-tight">{preset.label}</h3>
        {preset.description ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{preset.description}</p>
        ) : null}
      </div>

      <div className="gauge-gallery-dial relative min-h-0 flex-1 px-1 pb-2">
        {dialReady ? (
          <GaugeGalleryCardErrorBoundary
            name={preset.label}
            resetKey={`${preset.id}-${value.toFixed(3)}`}
          >
            <GaugePrimitive
              props={gaugeProps}
              layoutMode="studio"
              studioRemountKey={preset.id}
              className="h-full min-h-0 w-full"
            />
          </GaugeGalleryCardErrorBoundary>
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            …
          </div>
        )}
      </div>
    </article>
  );
}
