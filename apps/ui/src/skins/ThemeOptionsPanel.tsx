import { Typography } from "@mui/material";
import { useSkin } from "./SkinProvider";
import { ThemeOptionsFields } from "./ThemeOptionsFields";

/**
 * Theme / appearance controls (light-dark, accent, skin).
 * Used on System → Appearance — not as a floating FAB.
 * When signed in, prefs are saved to the user account.
 */
export function ThemeOptionsPanel() {
  const { skin, skins, setSkinId, themePrefs, setThemePrefs } = useSkin();

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose light or dark mode, accent colour, and layout style. Changes are saved to
        your account.
      </Typography>
      <ThemeOptionsFields
        themePrefs={themePrefs}
        skinId={skin.id}
        skins={skins}
        onThemeChange={setThemePrefs}
        onSkinChange={setSkinId}
      />
    </>
  );
}
