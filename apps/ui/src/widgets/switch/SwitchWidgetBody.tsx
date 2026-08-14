import {
  Box,
  Button,
  IconButton,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import type { Capability, WidgetInstance } from "../../api";
import { getDashboardIcon } from "../../lib/dashboard-icons";
import { isPlaceholderWidgetTitle } from "../../lib/widget-title";
import { parseSwitchConfig } from "./config";
import { useSwitchControl } from "./useSwitchControl";

type Props = {
  widget: WidgetInstance;
  cap: Capability | undefined;
  disabled: boolean;
  onCapabilityState?: (
    capabilityId: string,
    value: unknown,
    quality?: string,
    updatedAt?: string
  ) => void;
};

function SwitchError({ message }: { message: string }) {
  return (
    <Typography variant="caption" color="error">
      {message}
    </Typography>
  );
}

function actionButtonLabel(
  widget: WidgetInstance,
  cap: Capability | undefined,
  momentary: boolean,
  on: boolean
): string {
  if (momentary) return "Pulse";
  if (cap) return on ? "On" : "Off";
  const custom = widget.title?.trim();
  if (custom && !isPlaceholderWidgetTitle(custom, widget.type)) return custom;
  return "Control";
}

export function SwitchWidgetBody({
  widget,
  cap,
  disabled,
  onCapabilityState,
}: Props) {
  const theme = useTheme();
  const { iconId, buttonPriority, showButtonIcon, pulseMs } = parseSwitchConfig(widget.config);
  const Icon = getDashboardIcon(iconId);
  const accent = theme.palette.primary.main;
  const { on, busy, error, toggle, setOn, pulse } = useSwitchControl(
    cap,
    disabled,
    onCapabilityState
  );
  const muted = alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.38 : 0.42);
  const iconColor = on ? accent : muted;
  const controlDisabled = disabled || busy || !cap?.hasCommand;
  const buttonLabel = actionButtonLabel(widget, cap, widget.type === "switch_momentary", on);
  const iconBefore = showButtonIcon ? <Icon /> : undefined;

  if (widget.type === "switch_button") {
    const priority = buttonPriority;
    const variant =
      priority === "contained"
        ? on
          ? "contained"
          : "outlined"
        : priority === "outlined"
          ? on
            ? "contained"
            : "outlined"
          : "text";
    return (
      <Stack height="100%" justifyContent="center" spacing={0.5}>
        <Button
          fullWidth
          variant={variant}
          color="primary"
          disabled={controlDisabled}
          onClick={() => toggle()}
          startIcon={iconBefore}
          sx={{
            opacity: busy ? 0.7 : 1,
            fontWeight: on && priority === "text" ? 600 : undefined,
          }}
        >
          {buttonLabel}
        </Button>
        {error && <SwitchError message={error} />}
      </Stack>
    );
  }

  if (widget.type === "switch_momentary") {
    return (
      <Stack height="100%" justifyContent="center" spacing={0.5}>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          disabled={controlDisabled}
          onClick={() => void pulse(pulseMs)}
          startIcon={iconBefore}
          sx={{ opacity: busy ? 0.7 : 1 }}
        >
          {buttonLabel}
        </Button>
        {error && <SwitchError message={error} />}
      </Stack>
    );
  }

  if (widget.type === "switch_icon") {
    return (
      <Stack height="100%" justifyContent="center" alignItems="center" spacing={0.5}>
        <Box
          component="button"
          type="button"
          disabled={controlDisabled}
          onClick={() => toggle()}
          aria-label={
            cap ? `${on ? "Turn off" : "Turn on"} ${cap.name}` : "Toggle switch"
          }
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: 88,
            aspectRatio: "1",
            borderRadius: 2,
            border: "2px solid",
            borderColor: on ? accent : alpha(theme.palette.divider, 0.9),
            bgcolor: on ? alpha(accent, theme.palette.mode === "dark" ? 0.22 : 0.12) : "transparent",
            color: iconColor,
            cursor: controlDisabled ? "default" : "pointer",
            opacity: busy ? 0.65 : 1,
            transition: "border-color 0.2s, background-color 0.2s, color 0.2s",
            "&:hover": controlDisabled
              ? {}
              : {
                  borderColor: accent,
                  bgcolor: alpha(accent, theme.palette.mode === "dark" ? 0.18 : 0.1),
                },
            "&:disabled": { opacity: 0.5 },
          }}
        >
          <Icon sx={{ fontSize: 40 }} />
        </Box>
        {error && <SwitchError message={error} />}
      </Stack>
    );
  }

  if (widget.type === "switch_power") {
    return (
      <Stack height="100%" justifyContent="center" alignItems="center" spacing={0.5}>
        <IconButton
          disabled={controlDisabled}
          onClick={() => toggle()}
          aria-label={
            cap ? `${on ? "Turn off" : "Turn on"} ${cap.name}` : "Toggle switch"
          }
          sx={{
            width: 56,
            height: 56,
            border: "2px solid",
            borderColor: on ? accent : alpha(theme.palette.divider, 0.9),
            bgcolor: on ? accent : alpha(theme.palette.text.primary, 0.06),
            color: on ? theme.palette.primary.contrastText : iconColor,
            opacity: busy ? 0.65 : 1,
            "&:hover": controlDisabled
              ? {}
              : {
                  bgcolor: on ? accent : alpha(accent, 0.12),
                  borderColor: accent,
                },
          }}
        >
          <Icon sx={{ fontSize: 28 }} />
        </IconButton>
        {error && <SwitchError message={error} />}
      </Stack>
    );
  }

  if (widget.type === "switch_pill") {
    return (
      <Stack height="100%" justifyContent="center" spacing={0.5}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={on ? "on" : "off"}
          disabled={controlDisabled}
          onChange={(_, value) => {
            if (value === "on") void setOn(true);
            if (value === "off") void setOn(false);
          }}
          aria-label={cap ? `Control ${cap.name}` : "Switch control"}
        >
          <ToggleButton value="on" aria-label="Turn on">ON</ToggleButton>
          <ToggleButton value="off" aria-label="Turn off">OFF</ToggleButton>
        </ToggleButtonGroup>
        {error && <SwitchError message={error} />}
      </Stack>
    );
  }

  if (widget.type === "switch_compact") {
    return (
      <Stack height="100%" justifyContent="center" spacing={0.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Icon sx={{ fontSize: 28, color: iconColor, opacity: busy ? 0.65 : 1 }} />
          <Switch
            checked={on}
            disabled={controlDisabled}
            onChange={() => toggle()}
            inputProps={{
              "aria-label": cap
                ? `Toggle ${cap.name} on ${cap.deviceName}`
                : "Toggle switch",
            }}
          />
        </Stack>
        {error && <SwitchError message={error} />}
      </Stack>
    );
  }

  return (
    <Stack height="100%" justifyContent="center" spacing={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" color={on ? "success.main" : "text.secondary"}>
          {cap ? (on ? "ON" : "OFF") : "—"}
        </Typography>
        <Switch
          checked={on}
          disabled={controlDisabled}
          onChange={() => toggle()}
          inputProps={{
            "aria-label": cap
              ? `Toggle ${cap.name} on ${cap.deviceName}`
              : "Toggle switch",
          }}
        />
      </Stack>
      {error && <SwitchError message={error} />}
    </Stack>
  );
}
