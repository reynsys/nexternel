import {
  Bath,
  Bed,
  Car,
  ChefHat,
  Cpu,
  Droplets,
  Gauge,
  Heart,
  Home,
  Lamp,
  LayoutDashboard,
  Monitor,
  Moon,
  Sofa,
  Star,
  Sun,
  Thermometer,
  TreePine,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const DEFAULT_DASHBOARD_TAB_ICON = "layout-dashboard";

export const DASHBOARD_TAB_ICONS: {
  id: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "layout-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "home", label: "Home", icon: Home },
  { id: "sofa", label: "Living room", icon: Sofa },
  { id: "bed", label: "Bedroom", icon: Bed },
  { id: "chef-hat", label: "Kitchen", icon: ChefHat },
  { id: "bath", label: "Bathroom", icon: Bath },
  { id: "car", label: "Garage", icon: Car },
  { id: "tree-pine", label: "Garden", icon: TreePine },
  { id: "thermometer", label: "Climate", icon: Thermometer },
  { id: "droplets", label: "Humidity", icon: Droplets },
  { id: "gauge", label: "Sensors", icon: Gauge },
  { id: "zap", label: "Power", icon: Zap },
  { id: "wifi", label: "Network", icon: Wifi },
  { id: "cpu", label: "Devices", icon: Cpu },
  { id: "monitor", label: "Office", icon: Monitor },
  { id: "lamp", label: "Lights", icon: Lamp },
  { id: "sun", label: "Day", icon: Sun },
  { id: "moon", label: "Night", icon: Moon },
  { id: "star", label: "Favourite", icon: Star },
  { id: "heart", label: "Health", icon: Heart },
];

export function getDashboardTabIcon(iconId?: string | null): LucideIcon {
  const found = DASHBOARD_TAB_ICONS.find((i) => i.id === iconId);
  return found?.icon ?? LayoutDashboard;
}
