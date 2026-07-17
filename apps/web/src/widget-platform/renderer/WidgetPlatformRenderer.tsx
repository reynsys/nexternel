"use client";

import type { WidgetAppearanceConfig } from "@/types/dashboard";
import type { WidgetPlatformInstance } from "@/widget-platform/types";
import { isGaugePlatformInstance } from "@/widget-platform/types";
import { GaugeDefinitionView } from "@/widget-platform/renderer/GaugeDefinitionView";

interface SensorMeta {
  id: string;
  name: string;
  unit: string | null;
  sensorType: string;
  deviceName: string;
  roomName: string | null;
}

export function WidgetPlatformRenderer({
  instance,
  title,
  sensors,
  appearance,
  editPreview = false,
  showHeader = true,
  previewValue = null,
  className,
}: {
  instance: WidgetPlatformInstance;
  title?: string | null;
  sensors: SensorMeta[];
  appearance?: WidgetAppearanceConfig;
  editPreview?: boolean;
  showHeader?: boolean;
  previewValue?: number | null;
  className?: string;
}) {
  if (isGaugePlatformInstance(instance)) {
    return (
      <GaugeDefinitionView
        instance={instance}
        title={title}
        sensors={sensors}
        appearance={appearance}
        editPreview={editPreview}
        showHeader={showHeader}
        previewValue={previewValue}
        className={className}
      />
    );
  }

  return <p className="text-sm text-muted-foreground">Unknown widget definition</p>;
}
