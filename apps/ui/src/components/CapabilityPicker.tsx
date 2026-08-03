import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Capability } from "../api";
import {
  capabilityDeviceGroupLabel,
  capabilityOptionPrimary,
  capabilityOptionSecondary,
  filterCapabilitiesForPicker,
  sortCapabilitiesForPicker,
} from "../lib/capability-picker";

type Props = {
  capabilities: Capability[];
  value: string;
  onChange: (capabilityId: string) => void;
  label?: string;
  helperText?: string;
  size?: "small" | "medium";
  allowEmpty?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function CapabilityPicker({
  capabilities,
  value,
  onChange,
  label = "Sensor / relay",
  helperText,
  size = "small",
  allowEmpty = false,
  disabled = false,
  placeholder = "Search device or sensor…",
}: Props) {
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const filtered = query.trim()
      ? filterCapabilitiesForPicker(capabilities, query)
      : sortCapabilitiesForPicker(capabilities);
    return filtered;
  }, [capabilities, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Capability[]>();
    for (const cap of options) {
      const group = capabilityDeviceGroupLabel(cap);
      const list = map.get(group);
      if (list) list.push(cap);
      else map.set(group, [cap]);
    }
    return map;
  }, [options]);

  const validValue = options.some((c) => c.id === value)
    ? value
    : allowEmpty
      ? value
      : options[0]?.id ?? "";

  const defaultHelper =
    options.length === 0
      ? "No capabilities — add a device or Sync capabilities"
      : "Grouped by device — search then pick from the list";

  return (
    <Stack spacing={1}>
      <TextField
        size={size}
        fullWidth
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled || capabilities.length === 0}
      />
      <FormControl fullWidth size={size} disabled={disabled || options.length === 0}>
        <InputLabel id="capability-picker-label">{label}</InputLabel>
        <Select
          labelId="capability-picker-label"
          label={label}
          value={validValue}
          onChange={(e) => onChange(String(e.target.value))}
          MenuProps={{
            PaperProps: { sx: { maxHeight: 360 } },
          }}
        >
          {allowEmpty && <MenuItem value="">—</MenuItem>}
          {Array.from(groups.entries()).flatMap(([group, caps]) => [
            <ListSubheader key={`group-${group}`} sx={{ lineHeight: 2 }}>
              {group}
            </ListSubheader>,
            ...caps.map((cap) => (
              <MenuItem key={cap.id} value={cap.id}>
                <ListItemText
                  primary={capabilityOptionPrimary(cap)}
                  secondary={capabilityOptionSecondary(cap)}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </MenuItem>
            )),
          ])}
        </Select>
      </FormControl>
      {(helperText ?? defaultHelper) && (
        <Typography variant="caption" color="text.secondary">
          {helperText ?? defaultHelper}
        </Typography>
      )}
    </Stack>
  );
}
