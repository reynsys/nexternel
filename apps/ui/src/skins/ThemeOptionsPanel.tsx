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
        Light/dark, accent colour, and layout skin. Saved to your account (and this
        browser) so they follow you on any device after sign-in.
      </Typography>
      <ThemeOptionsFields
        themePrefs={themePrefs}
        skinId={skin.id}
        skins={skins}
        onThemeChange={setThemePrefs}
        onSkinChange={setSkinId}
        footnote={
          "Soft UI Pro (paid) can be imported later as a local skin under apps/ui/src/skins/local/ — it is not bundled here."
        }
      />
    </>
  );
}
