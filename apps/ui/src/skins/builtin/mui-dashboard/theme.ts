import { createTheme, alpha, type Theme } from "@mui/material/styles";
import type { ThemePrefs } from "../../themePrefs";
import { contentPanelStyles, isGradientActive } from "../../surfaceStyles";

function lightSurfaces() {
  return {
    default: "#f0f2f5",
    paper: "#ffffff",
  };
}

function darkSurfaces() {
  return {
    default: "hsl(220, 30%, 6%)",
    paper: "hsl(220, 30%, 7%)",
  };
}

/** MUI dashboard skin theme — mode + primary from Theme Configurator. */
export function createMuiDashboardTheme(prefs: ThemePrefs): Theme {
  const mode = prefs.mode;
  const primary = prefs.primary;
  const surfaces = mode === "dark" ? darkSurfaces() : lightSurfaces();
  const gradientActive = isGradientActive(prefs);
  const solidContentPanels = Boolean(prefs.solidContentPanels);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary,
        contrastText: mode === "dark" ? "#fff" : undefined,
      },
      secondary: {
        main: mode === "dark" ? alpha(primary, 0.85) : primary,
      },
      background: surfaces,
      divider: alpha(mode === "dark" ? "#fff" : "#000", mode === "dark" ? 0.12 : 0.08),
      text: {
        primary: mode === "dark" ? "#fff" : "#1a1f36",
        secondary: mode === "dark" ? "hsl(220, 20%, 65%)" : "rgba(0,0,0,0.6)",
      },
      action: {
        hover: alpha(primary, 0.08),
        selected: alpha(primary, 0.16),
      },
    },
    typography: {
      fontFamily: '"Inter", "IBM Plex Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h4: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${alpha(theme.palette.mode === "dark" ? "#fff" : "#000", 0.08)}`,
            ...contentPanelStyles(theme, { gradientActive, solidContentPanels }),
          }),
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: ({ theme }) => ({
            ...contentPanelStyles(theme, { gradientActive, solidContentPanels }),
            backgroundImage: "none",
            "&:before": { display: "none" },
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            borderRight: `1px solid ${alpha(mode === "dark" ? "#fff" : "#000", 0.08)}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            "&.Mui-selected": {
              backgroundColor: alpha(primary, 0.16),
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
    },
  });
}
