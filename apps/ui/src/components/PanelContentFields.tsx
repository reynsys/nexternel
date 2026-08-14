import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import type { PanelContentMode } from "@nexternel/domain";
import type { ResolvedPanelCapability } from "../api";
import {
  PANEL_CONTENT_MODE_HELP,
  PANEL_CONTENT_MODE_LABELS,
  panelItemPickerHeading,
} from "../lib/panel-content-copy";
import { PanelCapabilityOrderList } from "./PanelCapabilityOrderList";

type Props = {
  panelKind: string;
  contentMode: PanelContentMode;
  onContentModeChange: (mode: PanelContentMode) => void;
  capabilityIds: string[];
  onCapabilityIdsChange: (ids: string[]) => void;
  options: ResolvedPanelCapability[];
  disabled?: boolean;
};

export function PanelContentFields({
  panelKind,
  contentMode,
  onContentModeChange,
  capabilityIds,
  onCapabilityIdsChange,
  options,
  disabled = false,
}: Props) {
  const itemHeading = panelItemPickerHeading(panelKind);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Content</Typography>
      <FormControl disabled={disabled}>
        <RadioGroup
          value={contentMode}
          onChange={(e) => onContentModeChange(e.target.value as PanelContentMode)}
        >
          <FormControlLabel
            value="auto"
            control={<Radio size="small" />}
            label={
              <Stack spacing={0.25}>
                <Typography variant="body2">{PANEL_CONTENT_MODE_LABELS.auto}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {PANEL_CONTENT_MODE_HELP.auto}
                </Typography>
              </Stack>
            }
            sx={{ alignItems: "flex-start", mb: 1 }}
          />
          <FormControlLabel
            value="manual"
            control={<Radio size="small" />}
            label={
              <Stack spacing={0.25}>
                <Typography variant="body2">{PANEL_CONTENT_MODE_LABELS.manual}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {PANEL_CONTENT_MODE_HELP.manual}
                </Typography>
              </Stack>
            }
            sx={{ alignItems: "flex-start" }}
          />
        </RadioGroup>
      </FormControl>

      {contentMode === "auto" ? (
        <Typography variant="caption" color="text.secondary">
          {options.length === 0
            ? "No items match this scope yet."
            : `${options.length} item${options.length === 1 ? "" : "s"} match this panel now.`}
        </Typography>
      ) : (
        <PanelCapabilityOrderList
          options={options}
          value={capabilityIds}
          onChange={onCapabilityIdsChange}
          heading={itemHeading}
          disabled={disabled}
        />
      )}
    </Stack>
  );
}
