import type { WidgetInstance } from "../../api";
import { CalendarWidget } from "./CalendarWidget";
import { WeatherWidget } from "./WeatherWidget";
import { SystemInfoWidget } from "./SystemInfoWidget";
import { DeviceStatusWidget } from "./DeviceStatusWidget";
import { CameraWidget } from "./CameraWidget";
import { isGeneralWidgetType } from "./config";

export function GeneralWidgetBody({ widget }: { widget: WidgetInstance }) {
  if (!isGeneralWidgetType(widget.type)) return null;
  switch (widget.type) {
    case "calendar":
      return <CalendarWidget widget={widget} />;
    case "weather":
      return <WeatherWidget widget={widget} />;
    case "system_info":
      return <SystemInfoWidget widget={widget} />;
    case "device_status":
      return <DeviceStatusWidget widget={widget} />;
    case "camera":
      return <CameraWidget widget={widget} />;
    default:
      return null;
  }
}
