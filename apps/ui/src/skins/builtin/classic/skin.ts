import type { UiSkin } from "../../types";
import { ClassicLayout } from "./Layout";
import { createClassicTheme } from "./theme";

export const classicSkin: UiSkin = {
  id: "classic",
  label: "Classic",
  description: "Original V3 flat top navigation.",
  createTheme: createClassicTheme,
  Layout: ClassicLayout,
};

export default classicSkin;
