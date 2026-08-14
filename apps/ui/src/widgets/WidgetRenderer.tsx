import { Stack, Typography } from "@mui/material";
import type { Capability } from "../api";
import { api, type WidgetInstance } from "../api";
import { DashboardTileBody } from "../components/DashboardTileBody";
import { getPanelContribution } from "../plugins/registry";
import { PanelWidget, isPanelWidgetType } from "./panel";
import { useDashboardTileChrome } from "../lib/dashboard-tile-context";
import { EchartsContributionWidget } from "./echarts/EchartsContributionWidget";
import { isEchartsWidgetType } from "./echarts/config";

export function WidgetRenderer({
  widget,
  capabilities,
  editMode,
  sectionRoomId,
  onCapabilityState,
}: {
  widget: WidgetInstance;
  capabilities: Capability[];
  editMode: boolean;
  sectionRoomId?: string | null;
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
}) {
  const { showBodyHeading } = useDashboardTileChrome();

  if (isPanelWidgetType(widget.type)) {
    return (
      <PanelWidget widget={widget} sectionRoomId={sectionRoomId} />
    );
  }

  if (isEchartsWidgetType(widget.type)) {
    return (
      <DashboardTileBody widgetId={widget.id} widgetType={widget.type}>
        <EchartsContributionWidget
          widget={widget}
          capabilities={capabilities}
        />
      </DashboardTileBody>
    );
  }

  const plugin = getPanelContribution(widget.type);
  const PluginComponent = plugin?.Component;

  const body = PluginComponent ? (
    <PluginComponent
      widget={widget}
      capabilities={capabilities}
      editMode={editMode}
      showBodyHeading={showBodyHeading}
      onCapabilityCommand={async (capabilityId: string, action: "on" | "off") => {
        const res = await api.command(capabilityId, action);
        onCapabilityState?.(
          capabilityId,
          res.value,
          "good",
          new Date().toISOString()
        );
        return res;
      }}
    />
  ) : (
    <Stack height="100%" justifyContent="center" sx={{ px: 1 }}>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Unsupported widget. Remove it from the dashboard.
      </Typography>
    </Stack>
  );

  return (
    <DashboardTileBody widgetId={widget.id} widgetType={widget.type}>
      {body}
    </DashboardTileBody>
  );
}
