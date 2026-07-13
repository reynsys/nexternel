"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import type { DashboardLayoutDto, DashboardWidgetDto } from "@/types/dashboard";
import { GaugeSandboxToolbar } from "@/widget-platform/studio/GaugeSandboxToolbar";
import { GaugeStudioPreview } from "@/widget-platform/studio/GaugeStudioPreview";
import { GaugeGallery } from "@/widget-platform/studio/GaugeGallery";
import {
  defaultSandboxMidpoint,
  patchSandboxValueRange,
  platformFromPreset,
  platformToSandboxConfig,
  sandboxConfigToPlatform,
} from "@/widget-platform/studio/gauge-sandbox-bridge";
import { resolveWidgetPlatform } from "@/widget-platform/resolve/instance";
import { legacyGaugeToPlatform, legacyWidgetToGaugePlatform } from "@/widget-platform/definitions/gauge/legacy-map";
import { sensorIdFromBinding, isGaugePlatformInstance, type GaugePlatformInstance } from "@/widget-platform/types";
import { widgetSupportsGaugeStudio } from "@/widget-platform/resolve/instance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { widgetLabel } from "@/components/dashboard/WidgetContent";
import { APP_VERSION } from "@/lib/version";
import { sanitizeGaugePlatform, ensureGaugePlatform } from "@/widget-platform/studio/sanitize-platform";
import { buildStudioPlatformSnapshot } from "@/widget-platform/studio/studio-platform-snapshot";

function clonePlatform(instance: GaugePlatformInstance): GaugePlatformInstance {
  return JSON.parse(JSON.stringify(instance)) as GaugePlatformInstance;
}

function resolveStudioPlatform(widget: DashboardWidgetDto): GaugePlatformInstance | null {
  const resolved = resolveWidgetPlatform(widget);
  if (resolved && isGaugePlatformInstance(resolved)) {
    return sanitizeGaugePlatform(ensureGaugePlatform(resolved));
  }
  if (widget.type === "library" && widget.config.libraryId?.startsWith("gauge-")) {
    return sanitizeGaugePlatform(ensureGaugePlatform(legacyGaugeToPlatform(widget.config)));
  }
  const migrated = legacyWidgetToGaugePlatform(widget);
  return migrated ? sanitizeGaugePlatform(ensureGaugePlatform(migrated)) : null;
}

export function WidgetStudioClient({
  widgetId,
  layoutId,
  catalog,
}: {
  widgetId: string;
  layoutId: string;
  catalog: DashboardCatalog;
}) {
  const [widget, setWidget] = useState<DashboardWidgetDto | null>(null);
  const [platformDraft, setPlatformDraft] = useState<GaugePlatformInstance | null>(null);
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const [showWidgetFrame, setShowWidgetFrame] = useState(true);
  const [autoAnimate, setAutoAnimate] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/dashboard/layout?layoutId=${encodeURIComponent(layoutId)}`);
      if (!res.ok) {
        setError("Could not load dashboard layout");
        return;
      }
      const data: DashboardLayoutDto = await res.json();
      const w = data.widgets.find((x) => x.id === widgetId);
      if (!w) {
        setError("Widget not found on this layout");
        return;
      }
      setWidget(w);
      setTitle(w.title ?? "");

      const platform = resolveStudioPlatform(w);
      setPlatformDraft(platform);
      if (platform) {
        const sandboxCfg = platformToSandboxConfig(platform);
        setPreviewValue(defaultSandboxMidpoint(sandboxCfg));
      }
    } catch (err) {
      console.error("[WidgetStudio] load failed", err);
      setError("Could not load studio — check console or try again");
    }
  }, [layoutId, widgetId]);

  useEffect(() => {
    load();
  }, [load]);

  const sandbox = useMemo(
    () => (platformDraft ? platformToSandboxConfig(platformDraft) : null),
    [platformDraft]
  );

  useEffect(() => {
    if (!autoAnimate || !sandbox) return;
    const id = setInterval(() => {
      const span = sandbox.maxValue - sandbox.minValue;
      setPreviewValue(sandbox.minValue + Math.random() * span);
    }, 2500);
    return () => clearInterval(id);
  }, [autoAnimate, sandbox]);

  const label = widget
    ? widgetLabel(widget, catalog.sensors, catalog.relays)
    : "";

  async function save() {
    if (!widget || !platformDraft || !sandbox) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const platformToSave = buildStudioPlatformSnapshot(sandbox, platformDraft);
      const res = await fetch(`/api/dashboard/widgets/${widget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          rowSpan: widget.rowSpan,
          colSpan: widget.colSpan,
          config: {
            ...widget.config,
            platform: platformToSave,
            sensorId: sensorIdFromBinding(platformToSave.binding) ?? widget.config.sensorId,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setPlatformDraft(
        data.config?.platform ? clonePlatform(data.config.platform as GaugePlatformInstance) : platformToSave
      );
      setWidget((prev) =>
        prev
          ? {
              ...prev,
              title: data.title,
              rowSpan: data.rowSpan ?? prev.rowSpan,
              colSpan: data.colSpan ?? prev.colSpan,
              config: data.config,
            }
          : prev
      );
      setSaved(true);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !widget) {
    return (
      <Card className="p-6">
        <p className="text-destructive">{error}</p>
        <Link href="/admin/dashboard" className="mt-4 inline-block text-sm text-primary">
          ← Back to dashboard editor
        </Link>
      </Card>
    );
  }

  if (!widget) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">Loading studio…</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (!widgetSupportsGaugeStudio(widget) || !platformDraft || !sandbox || previewValue === null) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Widget Studio supports gauge widgets (library gauges, radial stat, internet speed). Other
          widget types will be added in a later step.
        </p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <Link href="/admin/dashboard" className="mt-4 inline-block text-sm text-primary">
          ← Back to dashboard editor
        </Link>
      </Card>
    );
  }

  return (
    <div className="gauge-studio-layout flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Dashboard editor
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Gauge Studio</h1>
          <p className="text-sm text-muted-foreground">
            {label} · {widget.colSpan}×{widget.rowSpan} grid cell ·{" "}
            <span className="font-mono text-foreground">{APP_VERSION}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved ? <span className="text-xs text-emerald-600">Saved</span> : null}
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save design"}
          </Button>
        </div>
      </div>

      <div className="gauge-studio-body grid min-h-[min(520px,58vh)] w-full max-w-none shrink-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,24%)_minmax(0,1fr)]">
        <GaugeStudioPreview
          widget={widget}
          label={label}
          title={title}
          onTitleChange={setTitle}
          platformDraft={platformDraft}
          onPlatformChange={setPlatformDraft}
          sandbox={sandbox}
          onSandboxChange={(next) =>
            setPlatformDraft(sandboxConfigToPlatform(next, platformDraft))
          }
          catalog={catalog}
          previewValue={previewValue}
          onPreviewValueChange={setPreviewValue}
          showWidgetFrame={showWidgetFrame}
          onShowWidgetFrameChange={setShowWidgetFrame}
          autoAnimate={autoAnimate}
          onAutoAnimateChange={setAutoAnimate}
        />

        <div className="gauge-studio-toolbar min-h-0 min-w-0 overflow-hidden">
          <GaugeSandboxToolbar
            sandbox={sandbox}
            onSandboxChange={(next) =>
              setPlatformDraft(sandboxConfigToPlatform(next, platformDraft))
            }
            instance={platformDraft}
            onInstanceChange={(next) => {
              setPlatformDraft(next);
              const nextSandbox = platformToSandboxConfig(next);
              setPreviewValue(defaultSandboxMidpoint(nextSandbox));
            }}
            sensors={catalog.sensors}
            previewValue={previewValue}
            onPreviewValueChange={setPreviewValue}
          />
        </div>
      </div>

      <GaugeGallery
        autoAnimate={autoAnimate}
        activePresetId={platformDraft.presetId}
        platformDraft={platformDraft}
        onApplyPreset={(presetId, value) => {
          const nextInstance = platformFromPreset(presetId, platformDraft);
          const nextSandbox = platformToSandboxConfig(nextInstance);
          const clamped = Math.min(
            nextSandbox.maxValue,
            Math.max(nextSandbox.minValue, value)
          );
          setPlatformDraft(sandboxConfigToPlatform(nextSandbox, nextInstance));
          setPreviewValue(clamped);
        }}
      />
    </div>
  );
}
