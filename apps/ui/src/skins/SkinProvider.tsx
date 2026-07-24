import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import type { UiSkin } from "./types";
import { getActiveSkinId, setActiveSkinId } from "./activeSkin";
import { getSkin, listSkins } from "./registry";
import {
  getThemePrefs,
  setThemePrefs as persistThemePrefs,
  type ThemePrefs,
  DEFAULT_THEME_PREFS,
} from "./themePrefs";

type SkinContextValue = {
  skin: UiSkin;
  skins: UiSkin[];
  setSkinId: (id: string) => void;
  themePrefs: ThemePrefs;
  setThemePrefs: (prefs: ThemePrefs | ((prev: ThemePrefs) => ThemePrefs)) => void;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skinId, setSkinIdState] = useState(() => getActiveSkinId());
  const [themePrefs, setThemePrefsState] = useState<ThemePrefs>(() => getThemePrefs());
  const skins = useMemo(() => listSkins(), []);
  const skin = useMemo(() => getSkin(skinId), [skinId]);
  const theme = useMemo(
    () => skin.createTheme(themePrefs),
    [skin, themePrefs]
  );

  const setSkinId = useCallback((id: string) => {
    setActiveSkinId(id);
    setSkinIdState(id);
  }, []);

  const setThemePrefs = useCallback(
    (prefs: ThemePrefs | ((prev: ThemePrefs) => ThemePrefs)) => {
      setThemePrefsState((prev) => {
        const next = typeof prefs === "function" ? prefs(prev) : prefs;
        persistThemePrefs(next);
        return next;
      });
    },
    []
  );

  const value = useMemo(
    () => ({ skin, skins, setSkinId, themePrefs, setThemePrefs }),
    [skin, skins, setSkinId, themePrefs, setThemePrefs]
  );

  return (
    <SkinContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SkinContext.Provider>
  );
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (!ctx) {
    throw new Error("useSkin must be used within SkinProvider");
  }
  return ctx;
}

export { DEFAULT_THEME_PREFS };
