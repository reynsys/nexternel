import { Stack, Typography, useTheme } from "@mui/material";
import type { ResolvedPanelCapability } from "../api";
import { parseCapabilityReading } from "./parse-capability-reading";

type Props = {
  cap: ResolvedPanelCapability;
};

/**
 * Large centred reading for Status (and future capability tiles).
 * Scales with the tile via container query units — matches plugin metric styling.
 */
export function PanelReadingValue({ cap }: Props) {
  const theme = useTheme();
  const { value, unit } = parseCapabilityReading(cap);
  const accent = theme.palette.primary.main;

  return (
    <Stack
      direction="row"
      alignItems="baseline"
      justifyContent="center"
      spacing={0.5}
      sx={{ width: "100%", minWidth: 0, px: 0.5 }}
    >
      <Typography
        component="div"
        sx={{
          fontSize: "clamp(1.25rem, 18cqi, 3.75rem)",
          fontWeight: 800,
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
          color: accent,
        }}
      >
        {value}
      </Typography>
      {unit && (
        <Typography
          component="span"
          sx={{
            fontSize: "clamp(0.75rem, 10cqi, 1.35rem)",
            fontWeight: 700,
            color: "text.secondary",
            lineHeight: 1.1,
            flexShrink: 0,
          }}
        >
          {unit}
        </Typography>
      )}
    </Stack>
  );
}
