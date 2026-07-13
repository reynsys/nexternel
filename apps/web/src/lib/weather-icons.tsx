import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

/** WMO weather interpretation codes (Open-Meteo). */
export function weatherIconForCode(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 67) return CloudRain;
  if (code <= 77) return CloudSnow;
  if (code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function weatherIconClassForCode(code: number): string {
  if (code === 0) return "text-amber-500";
  if (code <= 3) return "text-sky-500";
  if (code <= 48) return "text-muted-foreground";
  if (code <= 67) return "text-blue-500";
  if (code <= 77) return "text-sky-300";
  if (code >= 95) return "text-violet-500";
  return "text-muted-foreground";
}
