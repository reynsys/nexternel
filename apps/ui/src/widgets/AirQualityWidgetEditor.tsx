import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Capability, WidgetInstance } from "../api";
import { SlotBindingFields } from "../components/SlotBindingFields";
import { mergeBindingSlots, parseWidgetBindings } from "../lib/widget-bindings";
import {
  AIR_QUALITY_BINDING_SLOTS,
  AIR_QUALITY_WIDGET_TYPE,
} from "@nexternel/plugin-air-quality";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  capabilities: Capability[];
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

export function AirQualityWidgetEditor({ open, widget, capabilities, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [slots, setSlots] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !widget) return;
    const raw = widget.title?.trim() ?? "";
    setTitle(raw && raw !== "Air quality" && raw !== AIR_QUALITY_WIDGET_TYPE ? raw : "");
    const b = parseWidgetBindings(widget.bindings);
    setSlots({ ...(b.slots ?? {}) });
  }, [open, widget]);

  if (!widget || widget.type !== AIR_QUALITY_WIDGET_TYPE) return null;

  function handleApply() {
    onSave({
      title: title.trim() || undefined,
      bindings: mergeBindingSlots(widget!.bindings, slots),
    });
    onClose();
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 400 } } }}>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h6">Edit air quality panel</Typography>
        <TextField
          size="small"
          label="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />
        <Typography variant="subtitle2">Capability bindings</Typography>
        <SlotBindingFields
          slots={AIR_QUALITY_BINDING_SLOTS}
          capabilities={capabilities}
          values={slots}
          onChange={(key, id) => setSlots((prev) => ({ ...prev, [key]: id }))}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>Apply</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
