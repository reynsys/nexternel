"use client";

import { useMemo } from "react";
import type { RelaysPanelLayout } from "@/types/dashboard";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";
import {
  RelayPanelHorizontalRow,
  RelayPanelRoundRow,
  RelayPanelVerticalRow,
  RelaySwitchRow,
} from "@/library/widgets/switches/SwitchWidgets";
import { DevicePanelSensorStrip, type PanelSensorMeta } from "@/components/DevicePanelSensorStrip";
import { orderRelaysStable } from "@/lib/relay-order";
import { cn } from "@/lib/utils";

export interface DeviceRelayMeta {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  roomName: string | null;
  lastState: string | null;
  createdAt?: string;
}

function resolvePanelLayout(layout: RelaysPanelLayout | string | undefined): RelaysPanelLayout {
  if (
    layout === "grid-2" ||
    layout === "vertical" ||
    layout === "horizontal" ||
    layout === "round"
  ) {
    return layout;
  }
  return "list";
}

export function DeviceRelaysWidget({
  title,
  deviceName,
  roomName,
  relayIds,
  relays,
  layout = "list",
  editPreview = false,
  titleIcon,
  titleMode = "both",
  sensorIds = [],
  sensors = [],
}: {
  title?: string;
  deviceName: string;
  roomName?: string | null;
  relayIds: string[];
  relays: DeviceRelayMeta[];
  layout?: RelaysPanelLayout;
  editPreview?: boolean;
  titleIcon?: string | null;
  titleMode?: "title" | "icon" | "both";
  sensorIds?: string[];
  sensors?: PanelSensorMeta[];
}) {
  const items = useMemo(() => {
    const pool = relayIds
      .map((id) => relays.find((r) => r.id === id))
      .filter(Boolean) as DeviceRelayMeta[];
    return orderRelaysStable(pool);
  }, [relayIds, relays]);

  const panelLayout = resolvePanelLayout(layout);
  const heading = title || deviceName;

  if (editPreview) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/50 bg-black/20 p-3">
        <p className="truncate text-sm font-semibold">{heading}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {items.length || 4} relay switch{(items.length || 4) === 1 ? "" : "es"}
        </p>
      </div>
    );
  }

  function renderRelayRow(relay: DeviceRelayMeta) {
    const rowProps = {
      relayId: relay.id,
      name: relay.name,
      initialState: relay.lastState,
    };

    switch (panelLayout) {
      case "vertical":
        return <RelayPanelVerticalRow key={relay.id} {...rowProps} />;
      case "horizontal":
        return <RelayPanelHorizontalRow key={relay.id} {...rowProps} />;
      case "round":
        return <RelayPanelRoundRow key={relay.id} {...rowProps} />;
      default:
        return (
          <RelaySwitchRow
            key={relay.id}
            {...rowProps}
            compactGrid={panelLayout === "grid-2"}
          />
        );
    }
  }

  const bodyClass =
    panelLayout === "grid-2"
      ? "relay-panel-grid relay-panel-grid-2 grid h-full min-h-0 grid-cols-2 gap-0.5"
      : "flex min-h-0 flex-1 flex-col gap-0.5";

  const bodyOverflow =
    panelLayout === "grid-2" ? "overflow-hidden" : "overflow-y-auto overscroll-contain";

  const previewSensorIds = sensorIds;
  const previewSensors = sensors;

  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden text-left">
      <div className="relay-panel-header shrink-0">
        <WidgetTitleBar
          title={heading}
          iconKey={titleIcon}
          titleMode={titleMode}
          className="mb-0 px-0"
          titleClassName="text-sm leading-tight"
        />
      </div>
      {previewSensorIds.length > 0 && (
        <DevicePanelSensorStrip
          sensorIds={previewSensorIds}
          sensors={previewSensors}
          editPreview={editPreview}
        />
      )}
      <div
        className={cn("relay-panel-body min-h-0 flex-1", bodyOverflow, bodyClass)}
      >
        {items.map((relay) => renderRelayRow(relay))}
        {items.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">No relays on this device.</p>
        )}
      </div>
    </div>
  );
}
