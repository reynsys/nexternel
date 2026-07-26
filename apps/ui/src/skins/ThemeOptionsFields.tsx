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
import {
  GRADIENT_NONE_ID,
  GRADIENT_PALETTES,
} from "./gradientPalettes";
import { PRIMARY_SWATCHES, type ThemePrefs } from "./themePrefs";
import type { UiSkin } from "./types";

type Props = {
  themePrefs: ThemePrefs;
  skinId: string;
  skins: UiSkin[];
  onThemeChange: (prefs: ThemePrefs) => void;
  onSkinChange: (skinId: string) => void;
  /** Optional footnote under the controls */
  footnote?: string;
};

/**
 * Controlled light/dark + accent + skin picker.
 * Used by System → Appearance and Users → Edit.
 */
export function ThemeOptionsFields({
  themePrefs,
  skinId,
  skins,
  onThemeChange,
  onSkinChange,
  footnote,
}: Props) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Colour mode
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            variant={themePrefs.mode === "light" ? "contained" : "outlined"}
            onClick={() => onThemeChange({ ...themePrefs, mode: "light" })}
          >
            Light
          </Button>
          <Button
            fullWidth
            variant={themePrefs.mode === "dark" ? "contained" : "outlined"}
            onClick={() => onThemeChange({ ...themePrefs, mode: "dark" })}
          >
            Dark
          </Button>
        </Stack>
      </Box>

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
                  onClick={() => onThemeChange({ ...themePrefs, primary: s.color })}
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

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Gradient background
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          A page background with gradually changing colours.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Tooltip title="None (solid)">
            <IconButton
              aria-label="No gradient"
              onClick={() =>
                onThemeChange({ ...themePrefs, gradientId: GRADIENT_NONE_ID })
              }
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: "background.default",
                border: "2px solid",
                borderColor:
                  (themePrefs.gradientId ?? GRADIENT_NONE_ID) === GRADIENT_NONE_ID
                    ? "text.primary"
                    : "divider",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Off
            </IconButton>
          </Tooltip>
          {GRADIENT_PALETTES.map((g) => {
            const selected = themePrefs.gradientId === g.id;
            return (
              <Tooltip key={g.id} title={g.label}>
                <IconButton
                  aria-label={g.label}
                  onClick={() => onThemeChange({ ...themePrefs, gradientId: g.id })}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    backgroundImage: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                    border: "2px solid",
                    borderColor: selected ? "text.primary" : "transparent",
                    boxShadow: selected ? 2 : 0,
                    "&:hover": { opacity: 0.9 },
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>
        {(themePrefs.gradientId ?? GRADIENT_NONE_ID) !== GRADIENT_NONE_ID && (
          <FormControlLabel
            sx={{ mt: 1.5, alignItems: "flex-start", ml: 0 }}
            control={
              <Switch
                checked={Boolean(themePrefs.solidContentPanels)}
                onChange={(_, checked) =>
                  onThemeChange({ ...themePrefs, solidContentPanels: checked })
                }
              />
            }
            label={
              <Box>
                <Typography variant="body2">Solid light / dark panels</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Keep cards and lists in the solid Light or Dark colour instead of frosted
                  glass over the gradient (useful on System, Devices, and similar pages).
                </Typography>
              </Box>
            }
          />
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Layout skin
        </Typography>
        <RadioGroup value={skinId} onChange={(e) => onSkinChange(e.target.value)}>
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

      {footnote && (
        <Typography variant="caption" color="text.secondary">
          {footnote}
        </Typography>
      )}
    </Stack>
  );
}
