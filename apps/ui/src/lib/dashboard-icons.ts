import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HomeIcon from "@mui/icons-material/Home";
import WeekendIcon from "@mui/icons-material/Weekend";
import HotelIcon from "@mui/icons-material/Hotel";
import KitchenIcon from "@mui/icons-material/Kitchen";
import BathtubIcon from "@mui/icons-material/Bathtub";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ParkIcon from "@mui/icons-material/Park";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import SpeedIcon from "@mui/icons-material/Speed";
import BoltIcon from "@mui/icons-material/Bolt";
import WifiIcon from "@mui/icons-material/Wifi";
import MemoryIcon from "@mui/icons-material/Memory";
import ComputerIcon from "@mui/icons-material/Computer";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import StarIcon from "@mui/icons-material/Star";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SensorsIcon from "@mui/icons-material/Sensors";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import GrassIcon from "@mui/icons-material/Grass";

export type DashboardIconComponent = ComponentType<SvgIconProps>;

export const DEFAULT_DASHBOARD_TAB_ICON = "dashboard";
export const DEFAULT_SECTION_ICON = "view-module";

export const DASHBOARD_ICONS: {
  id: string;
  label: string;
  Icon: DashboardIconComponent;
}[] = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { id: "view-module", label: "Section", Icon: ViewModuleIcon },
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "sofa", label: "Living room", Icon: WeekendIcon },
  { id: "bed", label: "Bedroom", Icon: HotelIcon },
  { id: "kitchen", label: "Kitchen", Icon: KitchenIcon },
  { id: "bath", label: "Bathroom", Icon: BathtubIcon },
  { id: "garage", label: "Garage", Icon: DirectionsCarIcon },
  { id: "garden", label: "Garden", Icon: ParkIcon },
  { id: "grass", label: "Lawn", Icon: GrassIcon },
  { id: "door", label: "Room", Icon: MeetingRoomIcon },
  { id: "thermostat", label: "Climate", Icon: ThermostatIcon },
  { id: "humidity", label: "Humidity", Icon: WaterDropIcon },
  { id: "gauge", label: "Sensors", Icon: SpeedIcon },
  { id: "sensors", label: "Live", Icon: SensorsIcon },
  { id: "power", label: "Power", Icon: BoltIcon },
  { id: "wifi", label: "Network", Icon: WifiIcon },
  { id: "devices", label: "Devices", Icon: MemoryIcon },
  { id: "office", label: "Office", Icon: ComputerIcon },
  { id: "lights", label: "Lights", Icon: LightbulbIcon },
  { id: "sun", label: "Day", Icon: WbSunnyIcon },
  { id: "moon", label: "Night", Icon: DarkModeIcon },
  { id: "star", label: "Favourite", Icon: StarIcon },
  { id: "heart", label: "Health", Icon: FavoriteIcon },
];

export function getDashboardIcon(iconId?: string | null): DashboardIconComponent {
  const found = DASHBOARD_ICONS.find((i) => i.id === iconId);
  return found?.Icon ?? DashboardIcon;
}
