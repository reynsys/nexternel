import {
  Activity,
  Bolt,
  Cloud,
  Droplets,
  Fan,
  Flame,
  Gauge,
  Home,
  Lamp,
  Leaf,
  Lightbulb,
  Lock,
  Moon,
  Plug,
  Power,
  Shield,
  Sun,
  Thermometer,
  TreePine,
  Unlock,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const WIDGET_ICON_OPTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "power", label: "Power", icon: Power },
  { id: "lightbulb", label: "Light", icon: Lightbulb },
  { id: "lamp", label: "Lamp", icon: Lamp },
  { id: "plug", label: "Plug", icon: Plug },
  { id: "zap", label: "Zap", icon: Zap },
  { id: "bolt", label: "Bolt", icon: Bolt },
  { id: "home", label: "Home", icon: Home },
  { id: "thermometer", label: "Temp", icon: Thermometer },
  { id: "droplets", label: "Water", icon: Droplets },
  { id: "fan", label: "Fan", icon: Fan },
  { id: "flame", label: "Heat", icon: Flame },
  { id: "leaf", label: "Garden", icon: Leaf },
  { id: "tree", label: "Tree", icon: TreePine },
  { id: "sun", label: "Sun", icon: Sun },
  { id: "moon", label: "Moon", icon: Moon },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "lock", label: "Lock", icon: Lock },
  { id: "unlock", label: "Unlock", icon: Unlock },
  { id: "shield", label: "Security", icon: Shield },
  { id: "gauge", label: "Gauge", icon: Gauge },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "wifi", label: "WiFi", icon: Wifi },
];

const ICON_BY_ID = Object.fromEntries(WIDGET_ICON_OPTIONS.map((o) => [o.id, o.icon]));

export function resolveWidgetIcon(id?: string | null): LucideIcon | null {
  if (!id) return null;
  return ICON_BY_ID[id] ?? null;
}
