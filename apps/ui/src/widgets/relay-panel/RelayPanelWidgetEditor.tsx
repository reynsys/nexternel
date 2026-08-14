import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Collapse,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Capability, WidgetInstance } from "../../api";
import { RelayDevicePicker } from "../../components/RelayDevicePicker";
import {
  controllableRelaysForDevices,
  devicesWithControllableRelays,
  relayPanelDeviceIds,
  relayPanelLabel,
} from "./config";
import {
  parseRelayPanelConfig,
  relayLabelKey,
  relayRowLabel,
  type RelayPanelConfig,
} from "./labels";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  capabilities: Capability[];
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

export function RelayPanelWidgetEditor({
  open,
  widget,
  capabilities,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [relayLabels, setRelayLabels] = useState<Record<string, string>>({});
  const [labelsOpen, setLabelsOpen] = useState(false);

  const deviceOptions = devicesWithControllableRelays(capabilities);

  useEffect(() => {
    if (!open || !widget) return;
    const cfg = parseRelayPanelConfig(widget.config);
    setTitle(widget.title?.trim() ?? "");
    setDeviceIds(relayPanelDeviceIds(widget.bindings));
    setRelayLabels({ ...cfg.relayLabels });
    setLabelsOpen(Object.keys(cfg.relayLabels).length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/widget.id only
  }, [open, widget?.id]);

  const selectedRelays = useMemo(
    () => controllableRelaysForDevices(capabilities, deviceIds),
    [capabilities, deviceIds]
  );

  if (!widget) return null;

  const panelLabel = relayPanelLabel(widget.type);
  const multiDevice = deviceIds.length > 1;
  const emptyLabels: RelayPanelConfig = { relayLabels: {} };

  function handleApply() {
    if (deviceIds.length === 0) return;
    const trimmed = title.trim();
    const nextTitle = trimmed && trimmed !== panelLabel ? trimmed : undefined;
    const cleanedLabels: Record<string, string> = {};
    for (const cap of selectedRelays) {
      const key = relayLabelKey(cap);
      const custom = relayLabels[key]?.trim();
      const defaultLabel = relayRowLabel(cap, emptyLabels, multiDevice);
      if (custom && custom !== defaultLabel) cleanedLabels[key] = custom;
    }

    onSave({
      title: nextTitle,
      bindings: { deviceIds },
      config: {
        ...(widget.config ?? {}),
        relayLabels: cleanedLabels,
      },
    });
    onClose();
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 2 } }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Typography variant="h6">Edit {panelLabel.toLowerCase()}</Typography>
        <Typography variant="caption" color="text.secondary">
          Pick relay boards — every switch on each board appears in the widget.
          Rename relays globally under Admin → Devices.
        </Typography>

        <RelayDevicePicker
          options={deviceOptions}
          value={deviceIds}
          onChange={setDeviceIds}
        />

        <TextField
          label="Title"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          helperText="Heading above the list (area shown underneath automatically)"
        />

        {selectedRelays.length > 0 && (
          <Stack spacing={1}>
            <Button
              size="small"
              variant="text"
              onClick={() => setLabelsOpen((v) => !v)}
              sx={{ alignSelf: "flex-start" }}
            >
              {labelsOpen ? "Hide row labels" : "Customize row labels (optional)"}
            </Button>
            <Collapse in={labelsOpen}>
              <Stack spacing={1}>
                {selectedRelays.map((cap) => {
                  const key = relayLabelKey(cap);
                  const placeholder = relayRowLabel(cap, emptyLabels, multiDevice);
                  return (
                    <TextField
                      key={cap.id}
                      size="small"
                      fullWidth
                      label={placeholder}
                      placeholder={placeholder}
                      value={relayLabels[key] ?? ""}
                      onChange={(e) =>
                        setRelayLabels((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  );
                })}
              </Stack>
            </Collapse>
          </Stack>
        )}

        {deviceOptions.length === 0 && (
          <Typography variant="caption" color="warning.main">
            No relay devices found. Add a device under Devices first.
          </Typography>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: "auto" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply} disabled={deviceIds.length === 0}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
