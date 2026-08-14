import { Stack, Switch, Typography } from "@mui/material";
import type { Capability } from "../../api";
import type { RelayPanelConfig } from "./labels";
import { relayRowLabel } from "./labels";
import { useSwitchControl } from "../switch/useSwitchControl";

type Props = {
  cap: Capability;
  panelConfig: RelayPanelConfig;
  multiDevice: boolean;
  disabled: boolean;
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
};

export function RelayPanelRow({
  cap,
  panelConfig,
  multiDevice,
  disabled,
  onCapabilityState,
}: Props) {
  const { on, busy, error, toggle } = useSwitchControl(cap, disabled, onCapabilityState);
  const label = relayRowLabel(cap, panelConfig, multiDevice);
  const controlDisabled = disabled || busy || !cap.hasCommand;

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" noWrap title={label} sx={{ flex: 1, minWidth: 0 }}>
          {label}
        </Typography>
        <Switch
          size="small"
          checked={on}
          disabled={controlDisabled}
          onChange={() => toggle()}
          inputProps={{
            "aria-label": `Toggle ${label}`,
          }}
        />
      </Stack>
      {error && (
        <Typography variant="caption" color="error" noWrap title={error}>
          {error}
        </Typography>
      )}
    </Stack>
  );
}
