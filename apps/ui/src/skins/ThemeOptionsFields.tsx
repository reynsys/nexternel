import { useEffect, useState } from "react";
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  GRADIENT_NONE_ID,
  GRADIENT_PALETTES,
  getGradientPalette,
} from "./gradientPalettes";
import {
  PRIMARY_SWATCHES,
  accentFromGradient,
  normalizeAccentHex,
  type ThemePrefs,
} from "./themePrefs";
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
  const [customHex, setCustomHex] = useState(themePrefs.primary);
  const gradientActive =
    (themePrefs.gradientId ?? GRADIENT_NONE_ID) !== GRADIENT_NONE_ID;
  const gradient = getGradientPalette(themePrefs.gradientId);

  useEffect(() => {
    setCustomHex(themePrefs.primary);
  }, [themePrefs.primary]);

  function applyCustomHex(raw: string) {
    setCustomHex(raw);
    const normalized = normalizeAccentHex(raw);
    if (normalized) {
      onThemeChange({ ...themePrefs, primary: normalized });
    }
  }

  function matchGradient(which: "from" | "to" | "mid") {
    const color = accentFromGradient(themePrefs.gradientId, which);
    if (!color) return;
    onThemeChange({ ...themePrefs, primary: color });
  }

  const swatchSelected = PRIMARY_SWATCHES.some(
    (s) => s.color.toLowerCase() === themePrefs.primary.toLowerCase()
  );

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
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Solid colour for menus, tabs, and buttons (not a gradient — keeps text readable).
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {PRIMARY_SWATCHES.map((s) => {
            const selected =
              themePrefs.primary.toLowerCase() === s.color.toLowerCase();
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
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
          sx={{ mt: 1.5 }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: themePrefs.primary,
              border: "2px solid",
              borderColor: swatchSelected ? "divider" : "text.primary",
              flexShrink: 0,
            }}
            title="Current accent"
          />
          <TextField
            size="small"
            label="Custom hex"
            value={customHex}
            onChange={(e) => applyCustomHex(e.target.value)}
            placeholder="#1A73E8"
            inputProps={{ maxLength: 7, spellCheck: false }}
            sx={{ maxWidth: 160 }}
            helperText={
              !customHex.trim() || normalizeAccentHex(customHex)
                ? undefined
                : "Use #RRGGBB (e.g. #FB8C00)"
            }
            error={Boolean(customHex.trim()) && !normalizeAccentHex(customHex)}
          />
          <TextField
            size="small"
            type="color"
            label="Picker"
            value={
              normalizeAccentHex(themePrefs.primary) ?? DEFAULT_FALLBACK_COLOR
            }
            onChange={(e) => {
              const n = normalizeAccentHex(e.target.value);
              if (n) onThemeChange({ ...themePrefs, primary: n });
            }}
            sx={{
              width: 88,
              "& input": { cursor: "pointer", p: 0.5, height: 28 },
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        {gradientActive && gradient && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
              Match accent to page gradient ({gradient.label})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                onClick={() => matchGradient("from")}
                startIcon={
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: 0.5,
                      bgcolor: gradient.from,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                }
              >
                Start
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => matchGradient("mid")}
                startIcon={
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: 0.5,
                      backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                }
              >
                Mid
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => matchGradient("to")}
                startIcon={
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: 0.5,
                      bgcolor: gradient.to,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                }
              >
                End
              </Button>
            </Stack>
          </Box>
        )}
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
        {gradientActive && (
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

const DEFAULT_FALLBACK_COLOR = "#1A73E8";
