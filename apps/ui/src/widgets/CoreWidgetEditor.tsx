import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Capability, WidgetInstance } from "../api";
import { CapabilityPicker } from "../components/CapabilityPicker";
import {
  capabilityLocationLabel,
  defaultWidgetTitle,
} from "../lib/capability-labels";
import {
  editorTitleForBoundWidget,
  isPlaceholderWidgetTitle,
  kindLabelForWidgetType,
  persistBoundWidgetTitle,
} from "../lib/widget-title";

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

  // Init only when the drawer opens or the edited widget changes — not on every live MQTT tick.
  useEffect(() => {
    if (!open || !widget) return;
    const id =
      typeof widget.bindings.capabilityId === "string" ? widget.bindings.capabilityId : "";
    const cap = capabilities.find((c) => c.id === id);
    setCapabilityId(id);
    setTitle(editorTitleForBoundWidget(widget, cap));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/widget.id only
  }, [open, widget?.id]);

  if (!widget) return null;

  const options = capsForWidgetType(widget.type, capabilities);
  const cap = capabilities.find((c) => c.id === capabilityId);
  const kindLabel = kindLabelForWidgetType(widget.type);

  function handleApply() {
    onSave({
      title: persistBoundWidgetTitle(title, widget.type, cap) ?? defaultWidgetTitle(cap, kindLabel),
      bindings: capabilityId
        ? {
            capabilityId,
            ...(cap?.sourceId
              ? { sourceId: cap.sourceId, sourceType: cap.sourceType }
              : {}),
          }
        : {},
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

        <CapabilityPicker
          capabilities={options}
          value={capabilityId}
          onChange={(next) => {
            const prevCap = capabilities.find((c) => c.id === capabilityId);
            const nextCap = capabilities.find((c) => c.id === next);
            setCapabilityId(next);
            if (!nextCap) return;
            const prevDefault = defaultWidgetTitle(prevCap, kindLabel);
            const wasAuto =
              isPlaceholderWidgetTitle(title, widget.type) || title === prevDefault;
            if (wasAuto) setTitle(defaultWidgetTitle(nextCap, kindLabel));
          }}
          label={widget.type === "switch" ? "Relay / switch" : "Sensor"}
        />

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
