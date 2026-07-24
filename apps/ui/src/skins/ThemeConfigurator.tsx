import { useState } from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  Fab,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useSkin } from "./SkinProvider";
import { PRIMARY_SWATCHES } from "./themePrefs";

/**
 * Soft UI–style configurator UX, built in-house.
 * Does not use Soft UI Pro code (paid). Inspired by free MUI color-mode patterns
 * + Soft UI demo configurator layout.
 */
export function ThemeConfigurator() {
  const [open, setOpen] = useState(false);
  const { skin, skins, setSkinId, themePrefs, setThemePrefs } = useSkin();

  return (
    <>
      <Tooltip title="Theme options">
        <Fab
          color="primary"
          size="medium"
          aria-label="Open theme configurator"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            right: 20,
            bottom: 88,
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
        >
          <SettingsRoundedIcon />
        </Fab>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 320 },
            p: 2,
            bgcolor: "background.paper",
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Theme Configurator</Typography>
            <Typography variant="body2" color="text.secondary">
              Light/dark, accent colour, and layout skin. Saved in this browser.
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={() => setOpen(false)} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Colour mode
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            fullWidth
            variant={themePrefs.mode === "light" ? "contained" : "outlined"}
            onClick={() => setThemePrefs((p) => ({ ...p, mode: "light" }))}
          >
            Light
          </Button>
          <Button
            fullWidth
            variant={themePrefs.mode === "dark" ? "contained" : "outlined"}
            onClick={() => setThemePrefs((p) => ({ ...p, mode: "dark" }))}
          >
            Dark
          </Button>
        </Stack>

        <Typography variant="subtitle2" gutterBottom>
          Accent colour
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {PRIMARY_SWATCHES.map((s) => {
            const selected = themePrefs.primary.toLowerCase() === s.color.toLowerCase();
            return (
              <Tooltip key={s.id} title={s.label}>
                <IconButton
                  aria-label={s.label}
                  onClick={() => setThemePrefs((p) => ({ ...p, primary: s.color }))}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: s.color,
                    border: "2px solid",
                    borderColor: selected ? "text.primary" : "transparent",
                    boxShadow: selected ? 2 : 0,
                    "&:hover": { bgcolor: s.color, opacity: 0.9 },
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Layout skin
        </Typography>
        <RadioGroup
          value={skin.id}
          onChange={(e) => setSkinId(e.target.value)}
          sx={{ mb: 1 }}
        >
          {skins.map((s) => (
            <FormControlLabel
              key={s.id}
              value={s.id}
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">{s.label}</Typography>
                  {s.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {s.description}
                    </Typography>
                  )}
                </Box>
              }
            />
          ))}
        </RadioGroup>

        <Divider sx={{ my: 2 }} />

        <FormControlLabel
          control={
            <Switch
              checked={themePrefs.mode === "dark"}
              onChange={(_, checked) =>
                setThemePrefs((p) => ({ ...p, mode: checked ? "dark" : "light" }))
              }
            />
          }
          label="Dark mode"
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
          Soft UI Pro (paid) can be imported later as a local skin — it is not bundled here.
          Free MUI templates under Template/ inspire this panel; we do not ship Soft UI Pro
          source.
        </Typography>
      </Drawer>
    </>
  );
}
