import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { api, getStoredAccessToken, type UserThemePrefs } from "../api";
import type { UiSkin } from "./types";
import { getActiveSkinId, setActiveSkinId } from "./activeSkin";
import { getSkin, listSkins } from "./registry";
import {
  getThemePrefs,
  setThemePrefs as persistThemePrefsLocal,
  toAccountThemePrefs,
  normalizeThemePrefs,
  type ThemePrefs,
  DEFAULT_THEME_PREFS,
} from "./themePrefs";

type SkinContextValue = {
  skin: UiSkin;
  skins: UiSkin[];
  setSkinId: (id: string) => void;
  themePrefs: ThemePrefs;
  setThemePrefs: (prefs: ThemePrefs | ((prev: ThemePrefs) => ThemePrefs)) => void;
  /** Apply prefs from the signed-in user account (login / me). */
  applyAccountPrefs: (prefs: UserThemePrefs | null | undefined) => void;
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
  const persistServerRef = useRef(true);
  const hydratedRef = useRef(false);

  const pushAccountPrefs = useCallback(
    (prefs: ThemePrefs, nextSkinId: string) => {
      if (!getStoredAccessToken()) return;
      const body = {
        themePrefs: toAccountThemePrefs(prefs, nextSkinId),
      };
      void api.patchMe(body).catch(() => {
        /* keep local prefs if save fails */
      });
    },
    []
  );

  const applyAccountPrefs = useCallback((prefs: UserThemePrefs | null | undefined) => {
    if (!prefs) return;
    persistServerRef.current = false;
    const next = normalizeThemePrefs(prefs);
    const nextSkin = prefs.skinId?.trim() || next.skinId || getActiveSkinId();
    persistThemePrefsLocal(next);
    setThemePrefsState(next);
    setActiveSkinId(nextSkin);
    setSkinIdState(nextSkin);
    queueMicrotask(() => {
      persistServerRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!getStoredAccessToken()) return;
    hydratedRef.current = true;
    void api
      .me()
      .then((r) => applyAccountPrefs(r.user.themePrefs))
      .catch(() => {
        /* stay on local prefs */
      });
  }, [applyAccountPrefs]);

  const setSkinId = useCallback(
    (id: string) => {
      setActiveSkinId(id);
      setSkinIdState(id);
      setThemePrefsState((prev) => {
        const next = { ...prev, skinId: id };
        persistThemePrefsLocal(next);
        if (persistServerRef.current) {
          pushAccountPrefs(next, id);
        }
        return next;
      });
    },
    [pushAccountPrefs]
  );

  const setThemePrefs = useCallback(
    (prefs: ThemePrefs | ((prev: ThemePrefs) => ThemePrefs)) => {
      setThemePrefsState((prev) => {
        const next = typeof prefs === "function" ? prefs(prev) : prefs;
        persistThemePrefsLocal(next);
        if (persistServerRef.current) {
          pushAccountPrefs(next, next.skinId ?? skinId);
        }
        return next;
      });
    },
    [pushAccountPrefs, skinId]
  );

  const value = useMemo(
    () => ({
      skin,
      skins,
      setSkinId,
      themePrefs,
      setThemePrefs,
      applyAccountPrefs,
    }),
    [skin, skins, setSkinId, themePrefs, setThemePrefs, applyAccountPrefs]
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
