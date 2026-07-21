import { createTheme } from "@mui/material/styles";

/** Phase 1 shell theme — dark mode default (Master Plan). */
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#5c9ead" },
    secondary: { main: "#c4a35a" },
    background: {
      default: "#0f1419",
      paper: "#1a222c",
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});
