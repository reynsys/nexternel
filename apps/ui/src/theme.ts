/** @deprecated Prefer SkinProvider — kept for accidental imports. */
export { createClassicTheme } from "./skins/builtin/classic/theme";
import { createClassicTheme } from "./skins/builtin/classic/theme";
import { DEFAULT_THEME_PREFS } from "./skins/themePrefs";
export const theme = createClassicTheme(DEFAULT_THEME_PREFS);
