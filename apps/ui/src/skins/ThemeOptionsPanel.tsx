import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSkin } from "./SkinProvider";
import { PRIMARY_SWATCHES } from "./themePrefs";

/**
 * Theme / appearance controls (light-dark, accent, skin).
 * Used on System → Appearance — not as a floating FAB.
 */
export function ThemeOptionsPanel() {
  const { skin, skins, setSkinId, themePrefs, setThemePrefs } = useSkin();

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Light/dark, accent colour, and layout skin. Saved in this browser only.
      </Typography>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Colour mode
        </Typography>
        <Stack direction="row" spacing={1}>
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
      </Box>

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

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Accent colour
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Layout skin
        </Typography>
        <RadioGroup value={skin.id} onChange={(e) => setSkinId(e.target.value)}>
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
      </Box>

      <Typography variant="caption" color="text.secondary">
        Soft UI Pro (paid) can be imported later as a local skin under{" "}
        <code>apps/ui/src/skins/local/</code> — it is not bundled here. Free MUI templates
        in <code>Template/</code> are reference only.
      </Typography>
    </Stack>
  );
}
