import { useEffect, useState } from "react";
import type { PluginManifest, WidgetContribution } from "@nexternel/plugin-sdk";

export const CLOCK_WIDGET_TYPE = "plugin.clock";

export const clockPluginManifest: PluginManifest = {
  id: "nexternel.example-clock",
  version: "1.0.0",
  pluginApi: 1,
  name: "Example Clock",
  description: "First-party example plugin — digital clock widget",
  contributes: { widgets: [CLOCK_WIDGET_TYPE] },
};

export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}
    >
      <div style={{ fontSize: "1.75rem", fontWeight: 600 }}>
        {now.toLocaleTimeString()}
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: 4 }}>
        {now.toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    </div>
  );
}

export const clockWidgetContribution: WidgetContribution = {
  type: CLOCK_WIDGET_TYPE,
  label: "Clock",
  category: "system",
  needsCapability: false,
  Component: ClockWidget,
};
