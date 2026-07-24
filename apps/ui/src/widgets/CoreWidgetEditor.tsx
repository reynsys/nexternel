import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Capability, WidgetInstance } from "../api";
import {
  capabilityLocationLabel,
  capabilityPickerLabel,
  defaultWidgetTitle,
} from "../lib/capability-labels";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  capabilities: Capability[];
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

function capsForWidgetType(type: string, capabilities: Capability[]): Capability[] {
  if (type === "switch") return capabilities.filter((c) => c.kind === "switch");
  if (type === "stat") return capabilities.filter((c) => c.kind !== "switch");
  return capabilities;
}

export function CoreWidgetEditor({
  open,
  widget,
  capabilities,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [capabilityId, setCapabilityId] = useState("");

  useEffect(() => {
    if (!open || !widget) return;
    const id =
      typeof widget.bindings.capabilityId === "string" ? widget.bindings.capabilityId : "";
    const cap = capabilities.find((c) => c.id === id);
    setCapabilityId(id);
    setTitle(widget.title ?? defaultWidgetTitle(cap, widget.type));
  }, [open, widget, capabilities]);

  if (!widget) return null;

  const options = capsForWidgetType(widget.type, capabilities);
  const cap = capabilities.find((c) => c.id === capabilityId);
  const kindLabel =
    widget.type === "switch" ? "Switch" : widget.type === "stat" ? "Stat" : "Widget";

  function handleApply() {
    onSave({
      title: title.trim() || defaultWidgetTitle(cap, kindLabel),
      bindings: capabilityId ? { capabilityId } : {},
    });
    onClose();
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 400 }, p: 2 } }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Typography variant="h6">Edit {kindLabel.toLowerCase()}</Typography>
        <Typography variant="caption" color="text.secondary">
          Choose which relay or sensor this widget controls, and set the label shown on the
          dashboard.
        </Typography>

        <TextField
          label="Title"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          helperText="Shown on the widget (e.g. Garden lights)"
        />

        <FormControl fullWidth size="small">
          <InputLabel id="core-cap">Capability</InputLabel>
          <Select
            labelId="core-cap"
            label="Capability"
            value={capabilityId}
            onChange={(e) => {
              const next = e.target.value;
              setCapabilityId(next);
              const nextCap = capabilities.find((c) => c.id === next);
              if (nextCap) {
                const wasGeneric =
                  !title.trim() ||
                  title === "Switch" ||
                  title === "Stat" ||
                  title === "Auto" ||
                  title === widget.type;
                if (wasGeneric) setTitle(defaultWidgetTitle(nextCap, kindLabel));
              }
            }}
          >
            {options.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {capabilityPickerLabel(c)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {cap && (
          <Typography variant="body2" color="text.secondary">
            {capabilityLocationLabel(cap)}
            {cap.kind === "switch" ? " · relay" : ` · ${cap.kind}`}
          </Typography>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: "auto" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply} disabled={!capabilityId}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
