import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { DeviceRelayOption } from "../widgets/relay-panel/config";
import { relayDeviceOptionLabel } from "../widgets/relay-panel/config";
import { tidyDeviceName } from "../lib/capability-labels";

type Props = {
  options: DeviceRelayOption[];
  value: string[];
  onChange: (deviceIds: string[]) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
};

export function RelayDevicePicker({
  options,
  value,
  onChange,
  disabled = false,
  label = "Relay boards",
  helperText,
}: Props) {
  const selected = options.filter((d) => value.includes(d.deviceId));

  const defaultHelper =
    options.length === 0
      ? "No relay devices — add a board under Admin → Devices"
      : "Search and pick boards — all switches on each board appear in the widget";

  return (
    <>
      <Autocomplete
        multiple
        size="small"
        disabled={disabled || options.length === 0}
        options={options}
        value={selected}
        onChange={(_, next) =>
          onChange(
            next
              .map((d) => d.deviceId)
              .sort((a, b) => {
                const da = options.find((o) => o.deviceId === a);
                const db = options.find((o) => o.deviceId === b);
                const na = da ? tidyDeviceName(da.deviceName, da.roomName) : a;
                const nb = db ? tidyDeviceName(db.deviceName, db.roomName) : b;
                return na.localeCompare(nb);
              })
          )
        }
        getOptionLabel={relayDeviceOptionLabel}
        isOptionEqualToValue={(a, b) => a.deviceId === b.deviceId}
        limitTags={2}
        disableCloseOnSelect
        filterSelectedOptions
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.deviceId}
              size="small"
              label={tidyDeviceName(option.deviceName, option.roomName)}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={selected.length === 0 ? "Search devices…" : ""}
          />
        )}
        ListboxProps={{ style: { maxHeight: 280 } }}
      />
      {(helperText ?? defaultHelper) && (
        <Typography variant="caption" color="text.secondary">
          {helperText ?? defaultHelper}
        </Typography>
      )}
    </>
  );
}
