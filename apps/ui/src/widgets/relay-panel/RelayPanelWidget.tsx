import { Box, Stack, Typography } from "@mui/material";
import type { Capability, WidgetInstance } from "../../api";
import { tidyDeviceName } from "../../lib/capability-labels";
import {
  controllableRelaysForDevices,
  relayPanelDeviceIds,
  relayPanelLayout,
  resolveRelayPanelColumns,
} from "./config";
import { parseRelayPanelConfig } from "./labels";
import { RelayPanelRow } from "./RelayPanelRow";

type Props = {
  widget: WidgetInstance;
  capabilities: Capability[];
  editMode: boolean;
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
};

export function RelayPanelWidget({
  widget,
  capabilities,
  editMode,
  onCapabilityState,
}: Props) {
  const deviceIds = relayPanelDeviceIds(widget.bindings);
  const relays = controllableRelaysForDevices(capabilities, deviceIds);
  const layout = relayPanelLayout(widget.type);
  const panelConfig = parseRelayPanelConfig(widget.config);
  const multiDevice = deviceIds.length > 1;
  const singleDeviceCols = resolveRelayPanelColumns(
    relays.length,
    layout,
    false
  );

  const groups: { deviceId: string; deviceLabel: string; relays: Capability[] }[] = [];
  if (multiDevice) {
    const byDevice = new Map<string, Capability[]>();
    for (const cap of relays) {
      const list = byDevice.get(cap.deviceId) ?? [];
      list.push(cap);
      byDevice.set(cap.deviceId, list);
    }
    for (const [deviceId, caps] of byDevice) {
      const first = caps[0];
      groups.push({
        deviceId,
        deviceLabel: tidyDeviceName(first.deviceName, first.roomName),
        relays: caps,
      });
    }
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {deviceIds.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No devices bound — edit widget to choose relay boards.
        </Typography>
      ) : relays.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No switches on the selected devices.
        </Typography>
      ) : multiDevice ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Stack spacing={1}>
            {groups.map((group) => (
              <Box key={group.deviceId}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: "block", mb: 0.5 }}
                >
                  {group.deviceLabel}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${resolveRelayPanelColumns(
                      group.relays.length,
                      layout,
                      true
                    )}, minmax(0, 1fr))`,
                    gap: 0.75,
                  }}
                >
                  {group.relays.map((cap) => (
                    <RelayPanelRow
                      key={cap.id}
                      cap={cap}
                      panelConfig={panelConfig}
                      multiDevice={true}
                      disabled={editMode}
                      onCapabilityState={onCapabilityState}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${singleDeviceCols}, minmax(0, 1fr))`,
              gap: 0.75,
              alignContent: "start",
            }}
          >
            {relays.map((cap) => (
              <RelayPanelRow
                key={cap.id}
                cap={cap}
                panelConfig={panelConfig}
                multiDevice={false}
                disabled={editMode}
                onCapabilityState={onCapabilityState}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
