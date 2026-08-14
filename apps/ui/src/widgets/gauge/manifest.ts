import type { PanelBindingSlotDef } from "@nexternel/plugin-sdk";

export const GAUGE_WIDGET_TYPE = "plugin.gauge";

export const GAUGE_BINDING_SLOTS: PanelBindingSlotDef[] = [
  {
    key: "primary",
    label: "Sensor",
    kinds: [
      "temperature",
      "humidity",
      "pressure",
      "battery",
      "voltage",
      "current",
      "power",
      "energy",
      "co2",
      "pm1",
      "pm25",
      "pm10",
      "number",
    ],
    required: true,
  },
];

export const gaugePanelMeta = {
  type: GAUGE_WIDGET_TYPE,
  label: "Gauge",
  category: "sensors" as const,
  needsCapability: false,
  bindingSlots: GAUGE_BINDING_SLOTS,
  defaultSize: { w: 3, h: 4 },
  /** Between Status (20) and Charts (30) in Add Panel. */
  catalogSortOrder: 25,
};
