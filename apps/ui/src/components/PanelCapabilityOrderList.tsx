import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { ResolvedPanelCapability } from "../api";
import { capabilityKindLabel } from "../lib/capability-kind-labels";
import {
  capabilityOptionContextLine,
  capabilityOptionPrimary,
} from "../lib/capability-picker";
import { asSwitchCapability } from "../panels/panel-capabilities";

type Props = {
  options: ResolvedPanelCapability[];
  value: string[];
  onChange: (ids: string[]) => void;
  heading: string;
  disabled?: boolean;
};

function reorderIds(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) {
    return ids;
  }
  const next = [...ids];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

export function PanelCapabilityOrderList({
  options,
  value,
  onChange,
  heading,
  disabled = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addId, setAddId] = useState("");

  const byId = useMemo(() => new Map(options.map((c) => [c.id, c])), [options]);

  const selected = useMemo(
    () => value.map((id) => byId.get(id)).filter((c): c is ResolvedPanelCapability => Boolean(c)),
    [value, byId]
  );

  const available = useMemo(
    () => options.filter((c) => !value.includes(c.id)),
    [options, value]
  );

  function removeId(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function addSelected() {
    if (!addId || value.includes(addId)) return;
    onChange([...value, addId]);
    setAddId("");
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{heading}</Typography>
      {selected.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No items selected yet. Add one below.
        </Typography>
      ) : (
        <List dense disablePadding>
          {selected.map((cap, index) => (
            <ListItem
              key={cap.id}
              disableGutters
              draggable={!disabled}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex == null || dragIndex === index) return;
                onChange(reorderIds(value, dragIndex, index));
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              secondaryAction={
                <Stack direction="row" spacing={0.25}>
                  <IconButton
                    size="small"
                    aria-label="Move up"
                    disabled={disabled || index === 0}
                    onClick={() => onChange(reorderIds(value, index, index - 1))}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Move down"
                    disabled={disabled || index === selected.length - 1}
                    onClick={() => onChange(reorderIds(value, index, index + 1))}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Remove"
                    disabled={disabled}
                    onClick={() => removeId(cap.id)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                mb: 0.75,
                pr: 14,
                bgcolor: dragIndex === index ? "action.hover" : undefined,
              }}
            >
              <DragIndicatorIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.disabled", cursor: disabled ? "default" : "grab" }}
              />
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap>
                    <Typography variant="body2" noWrap>
                      {capabilityOptionPrimary(asSwitchCapability(cap))}
                    </Typography>
                    <Chip label={capabilityKindLabel(cap.kind)} size="small" variant="outlined" />
                  </Stack>
                }
                secondary={capabilityOptionContextLine(asSwitchCapability(cap))}
                primaryTypographyProps={{ component: "div" }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {available.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel id="panel-add-item">Add item</InputLabel>
            <Select
              labelId="panel-add-item"
              label="Add item"
              value={addId}
              onChange={(e) => setAddId(String(e.target.value))}
            >
              <MenuItem value="">—</MenuItem>
              {available.map((cap) => (
                <MenuItem key={cap.id} value={cap.id}>
                  <ListItemText
                    primary={capabilityOptionPrimary(asSwitchCapability(cap))}
                    secondary={capabilityOptionContextLine(asSwitchCapability(cap))}
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ pb: 0.25 }}>
            <IconButton
              color="primary"
              disabled={disabled || !addId}
              aria-label="Add item"
              onClick={addSelected}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Stack>
      )}

      {options.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No items in this scope — adjust place or category first.
        </Typography>
      )}
    </Stack>
  );
}
