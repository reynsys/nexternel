import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { Capability, WidgetInstance } from "../../api";
import { CapabilityPicker } from "../../components/CapabilityPicker";
import { DashboardIconPicker } from "../../components/DashboardIconPicker";
import {
  capabilityLocationLabel,
  controllableSwitches,
  defaultWidgetTitle,
} from "../../lib/capability-labels";
import {
  editorTitleForBoundWidget,
  isPlaceholderWidgetTitle,
  persistBoundWidgetTitle,
} from "../../lib/widget-title";
import {
  parseSwitchConfig,
  switchIsMomentary,
  switchUsesButtonPriority,
  switchUsesIcon,
  switchWidgetLabel,
  type SwitchButtonPriority,
} from "./config";

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  capabilities: Capability[];
  onClose: () => void;
  onSave: (patch: Partial<WidgetInstance>) => void;
};

export function SwitchWidgetEditor({
  open,
  widget,
  capabilities,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [capabilityId, setCapabilityId] = useState("");
  const [iconId, setIconId] = useState("lights");
  const [buttonPriority, setButtonPriority] = useState<SwitchButtonPriority>("contained");
  const [showButtonIcon, setShowButtonIcon] = useState(true);
  const [pulseMs, setPulseMs] = useState("500");

  useEffect(() => {
    if (!open || !widget) return;
    const id =
      typeof widget.bindings.capabilityId === "string" ? widget.bindings.capabilityId : "";
    const cap = capabilities.find((c) => c.id === id);
    const cfg = parseSwitchConfig(widget.config);
    setCapabilityId(id);
    setTitle(editorTitleForBoundWidget(widget, cap));
    setIconId(cfg.iconId);
    setButtonPriority(cfg.buttonPriority);
    setShowButtonIcon(cfg.showButtonIcon);
    setPulseMs(String(cfg.pulseMs));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/widget.id only
  }, [open, widget?.id]);

  if (!widget) return null;

  const options = controllableSwitches(capabilities);
  const cap = capabilities.find((c) => c.id === capabilityId);
  const kindLabel = switchWidgetLabel(widget.type);
  const showIconPicker = switchUsesIcon(widget.type);
  const showPriority = switchUsesButtonPriority(widget.type);
  const showPulse = switchIsMomentary(widget.type);

  function handleApply() {
    const nextConfig = { ...(widget.config ?? {}) };
    if (showIconPicker) {
      nextConfig.iconId = iconId;
      if (widget.type === "switch_button" || widget.type === "switch_momentary") {
        nextConfig.showButtonIcon = showButtonIcon;
      }
    }
    if (showPriority) {
      nextConfig.buttonPriority = buttonPriority;
    }
    if (showPulse) {
      const ms = Number(pulseMs);
      nextConfig.pulseMs = Number.isFinite(ms)
        ? Math.min(5000, Math.max(100, Math.round(ms)))
        : 500;
    }
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
      config: nextConfig,
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
          {showPulse
            ? "Pulse sends ON then OFF — for momentary relays (gates, doorbells)."
            : "Choose the relay, button style, optional icon, and label."}
        </Typography>

        <TextField
          label="Title"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          helperText={
            showPulse || widget.type === "switch_button"
              ? "Shown on the button (e.g. Garden lights)"
              : "Shown on the widget (e.g. Garden lights)"
          }
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
          label="Relay / switch"
        />

        {showPriority && (
          <FormControl size="small" fullWidth>
            <InputLabel id="switch-button-priority-label">Button style</InputLabel>
            <Select
              labelId="switch-button-priority-label"
              label="Button style"
              value={buttonPriority}
              onChange={(e) =>
                setButtonPriority(e.target.value as SwitchButtonPriority)
              }
            >
              <MenuItem value="contained">Filled (accent when on)</MenuItem>
              <MenuItem value="outlined">Outline</MenuItem>
              <MenuItem value="text">Flat / text</MenuItem>
            </Select>
          </FormControl>
        )}

        {showPulse && (
          <TextField
            label="Pulse length (ms)"
            size="small"
            fullWidth
            type="number"
            inputProps={{ min: 100, max: 5000, step: 100 }}
            value={pulseMs}
            onChange={(e) => setPulseMs(e.target.value)}
            helperText="How long the relay stays ON before auto OFF (100–5000)"
          />
        )}

        {showIconPicker && (
          <DashboardIconPicker dense value={iconId} onChange={setIconId} />
        )}

        {(widget.type === "switch_button" || widget.type === "switch_momentary") && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showButtonIcon}
                onChange={(e) => setShowButtonIcon(e.target.checked)}
              />
            }
            label="Show icon on button"
          />
        )}

        {cap && (
          <Typography variant="body2" color="text.secondary">
            {capabilityLocationLabel(cap)} · relay
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
