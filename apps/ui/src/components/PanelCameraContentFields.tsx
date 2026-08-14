import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import type { PanelContentMode } from "@nexternel/domain";
import type { CameraRecord } from "../api";
import {
  PANEL_CONTENT_MODE_HELP,
  PANEL_CONTENT_MODE_LABELS,
  panelItemPickerHeading,
} from "../lib/panel-content-copy";
import { PanelCameraOrderList } from "./PanelCameraOrderList";

type Props = {
  contentMode: PanelContentMode;
  onContentModeChange: (mode: PanelContentMode) => void;
  cameraIds: string[];
  onCameraIdsChange: (ids: string[]) => void;
  options: CameraRecord[];
  disabled?: boolean;
};

export function PanelCameraContentFields({
  contentMode,
  onContentModeChange,
  cameraIds,
  onCameraIdsChange,
  options,
  disabled = false,
}: Props) {
  const itemHeading = panelItemPickerHeading("panel.camera");

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Cameras</Typography>
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
            ? "No cameras match this scope yet."
            : `${options.length} camera${options.length === 1 ? "" : "s"} match this panel now.`}
        </Typography>
      ) : (
        <PanelCameraOrderList
          options={options}
          value={cameraIds}
          onChange={onCameraIdsChange}
          heading={itemHeading}
          disabled={disabled}
        />
      )}
    </Stack>
  );
}
