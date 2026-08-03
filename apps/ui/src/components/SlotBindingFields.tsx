import { FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import type { WidgetBindingSlotDef } from "@nexternel/plugin-sdk";
import type { Capability } from "../api";
import { capabilityPickerLabel } from "../lib/capability-labels";
import { capabilitiesForSlot } from "../lib/slot-bindings";

type Props = {
  slots: WidgetBindingSlotDef[];
  capabilities: Capability[];
  values: Record<string, string>;
  onChange: (key: string, capabilityId: string) => void;
};

export function SlotBindingFields({ slots, capabilities, values, onChange }: Props) {
  return (
    <Stack spacing={2}>
      {slots.map((slot) => {
        const pool = capabilitiesForSlot(capabilities, slot);
        const value = values[slot.key] ?? "";
        const valid = pool.some((c) => c.id === value);
        return (
          <FormControl key={slot.key} fullWidth size="small">
            <InputLabel id={`slot-${slot.key}`}>{slot.label}</InputLabel>
            <Select
              labelId={`slot-${slot.key}`}
              label={slot.label}
              value={valid ? value : pool[0]?.id ?? ""}
              onChange={(e) => onChange(slot.key, e.target.value)}
            >
              {!slot.required && <MenuItem value="">—</MenuItem>}
              {pool.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {capabilityPickerLabel(c)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      })}
    </Stack>
  );
}
