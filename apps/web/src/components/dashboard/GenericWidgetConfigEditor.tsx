"use client";

import type { WidgetConfig, WidgetType } from "@/types/dashboard";
import type { AnalogClockStyle, DigitalClockStyle } from "@/types/dashboard";

export function GenericWidgetConfigEditor({
  type,
  config,
  onChange,
}: {
  type: WidgetType;
  config: WidgetConfig;
  onChange: (patch: WidgetConfig) => void;
}) {
  if (type === "time") {
    const isAnalog = config.timeMode === "analog";
    return (
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
        <p className="font-semibold">Clock options</p>
        <label className={labelClass}>Display</label>
        <select
          className="input w-full"
          value={config.timeMode || "digital"}
          onChange={(e) =>
            onChange({ timeMode: e.target.value as "digital" | "analog" })
          }
        >
          <option value="digital">Digital</option>
          <option value="analog">Analog</option>
        </select>
        {isAnalog ? (
          <>
            <label className={labelClass}>Analog style</label>
            <select
              className="input w-full"
              value={config.analogClockStyle || "classic"}
              onChange={(e) =>
                onChange({ analogClockStyle: e.target.value as AnalogClockStyle })
              }
            >
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
              <option value="roman">Roman numerals</option>
            </select>
          </>
        ) : (
          <>
            <label className={labelClass}>Digital style</label>
            <select
              className="input w-full"
              value={config.digitalClockStyle || "standard"}
              onChange={(e) =>
                onChange({ digitalClockStyle: e.target.value as DigitalClockStyle })
              }
            >
              <option value="standard">Standard</option>
              <option value="mono">Monospace</option>
              <option value="bold">Bold compact</option>
            </select>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.showSeconds !== false}
                onChange={(e) => onChange({ showSeconds: e.target.checked })}
              />
              Show seconds
            </label>
          </>
        )}
      </div>
    );
  }

  if (type === "weather") {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
        <p className="font-semibold">Weather location</p>
        <p className="text-muted-foreground">Uses Open-Meteo (free, no API key). Wind in mph.</p>
        <label className={labelClass}>Label</label>
        <input
          className="input w-full"
          value={config.weatherLocation || ""}
          onChange={(e) => onChange({ weatherLocation: e.target.value })}
          placeholder="e.g. London"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Latitude</label>
            <input
              type="number"
              step="0.0001"
              className="input w-full"
              value={config.weatherLat ?? 51.5074}
              onChange={(e) => onChange({ weatherLat: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={labelClass}>Longitude</label>
            <input
              type="number"
              step="0.0001"
              className="input w-full"
              value={config.weatherLon ?? -0.1278}
              onChange={(e) => onChange({ weatherLon: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (type === "activity_log") {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
        <p className="font-semibold">Log options</p>
        <label className={labelClass}>Visible rows (scroll when exceeded)</label>
        <input
          type="number"
          min={3}
          max={24}
          className="input w-full"
          value={config.logVisibleRows ?? 8}
          onChange={(e) => onChange({ logVisibleRows: Number(e.target.value) })}
        />
        <label className={labelClass}>Max entries fetched</label>
        <input
          type="number"
          min={10}
          max={200}
          className="input w-full"
          value={config.logLimit ?? 100}
          onChange={(e) => onChange({ logLimit: Number(e.target.value) })}
        />
        <label className={labelClass}>Category filter (optional)</label>
        <select
          className="input w-full"
          value={config.logCategories?.[0] || ""}
          onChange={(e) =>
            onChange({ logCategories: e.target.value ? [e.target.value] : undefined })
          }
        >
          <option value="">All categories</option>
          <option value="relay">Relay</option>
          <option value="dashboard">Dashboard</option>
          <option value="mqtt">MQTT</option>
          <option value="system">System</option>
          <option value="device">Device</option>
        </select>
      </div>
    );
  }

  if (type === "speed_test") {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
        <p className="font-semibold">Speed test</p>
        <p className="text-muted-foreground">
          Tests run from your Ubuntu server (download/upload via Cloudflare). Shows LAN and WAN IP
          with gauge readouts. Use at least a <strong>2×2</strong> grid cell so both dials fit — resize
          in the dashboard editor if gauges are clipped.
        </p>
        <label className={labelClass}>Test every (minutes)</label>
        <input
          type="number"
          min={2}
          max={15}
          className="input w-full"
          value={config.speedTestIntervalMinutes ?? 3}
          onChange={(e) => onChange({ speedTestIntervalMinutes: Number(e.target.value) })}
        />
      </div>
    );
  }

  return null;
}

const labelClass = "text-xs font-medium text-muted-foreground";
