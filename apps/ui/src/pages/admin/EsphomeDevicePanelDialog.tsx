import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { api, type DeviceRecord } from "../../api";

type Props = {
  open: boolean;
  device: DeviceRecord | null;
  busy: boolean;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string) => void;
  onUpdated: () => void;
};

export function EsphomeDevicePanelDialog({
  open,
  device,
  busy,
  onClose,
  onBusy,
  onError,
  onSuccess,
  onUpdated,
}: Props) {
  const [tab, setTab] = useState(0);
  const [log, setLog] = useState("");
  const [yaml, setYaml] = useState("");
  const [yamlPath, setYamlPath] = useState("");
  const [managementMode, setManagementMode] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !device) return;
    setTab(0);
    setLog("");
    setYaml("");
    setYamlPath("");
    setManagementMode(device.esphomeManagementMode ?? null);
    void api
      .esphomeDeviceYaml(device.id)
      .then((res) => {
        setYaml(res.yaml);
        setYamlPath(res.path);
        setManagementMode(res.managementMode ?? device.esphomeManagementMode ?? null);
      })
      .catch(() => {
        setYaml("");
      });
  }, [open, device]);

  async function runCompile() {
    if (!device) return;
    onBusy(true);
    onError(null);
    setLog("Compiling firmware… this may take a few minutes.");
    try {
      const res = await api.esphomeCompile(device.id);
      setLog(res.log || (res.ok ? "Compile finished." : "Compile failed."));
      setInfo(res);
      await onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Compile failed";
      setLog(message);
      onError(message);
    } finally {
      onBusy(false);
    }
  }

  async function runUpload() {
    if (!device) return;
    onBusy(true);
    onError(null);
    setLog("Installing firmware over the air…");
    try {
      const res = await api.esphomeUpload(device.id);
      setLog(res.log || (res.ok ? "Upload finished." : "Upload failed."));
      setInfo(res);
      await onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setLog(message);
      onError(message);
    } finally {
      onBusy(false);
    }
  }

  function setInfo(res: { ok: boolean }) {
    if (!device) return;
    onSuccess(
      res.ok
        ? `ESPHome action completed for ${device.name}.`
        : `ESPHome action failed for ${device.name}. See log for details.`
    );
  }

  async function runValidate() {
    if (!device) return;
    onBusy(true);
    onError(null);
    try {
      const res = await api.esphomeValidateYaml(device.id);
      setLog(res.log || (res.ok ? "Configuration is valid." : "Validation failed."));
      if (!res.ok) onError("YAML validation failed");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Validate failed");
    } finally {
      onBusy(false);
    }
  }

  async function runDownloadFlashYaml() {
    if (!device) return;
    const stem = (device.esphomeName || device.slug || "").trim();
    if (!stem) {
      onError("Device has no ESPHome name / slug — cannot build flash YAML");
      return;
    }
    onBusy(true);
    onError(null);
    try {
      const { blob, filename } = await api.downloadFlashReadyYaml(stem);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onSuccess(
        `Downloaded ${filename}. Flash via USB using web.esphome.io or ESPHome Install → Plug into this computer.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Flash YAML download failed");
    } finally {
      onBusy(false);
    }
  }

  async function runSaveYaml() {
    if (!device) return;
    onBusy(true);
    onError(null);
    try {
      const res = await api.esphomeSaveDeviceYaml(device.id, yaml);
      setLog(res.log || (res.ok ? "Saved." : "Save failed."));
      if (res.ok) {
        setManagementMode(res.managementMode);
        onSuccess(`Saved advanced YAML for ${device.name}.`);
        await onUpdated();
      } else {
        onError("YAML validation failed — not saved.");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      onBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="md">
      <DialogTitle>ESPHome — {device?.name ?? ""}</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Firmware" />
          <Tab label="Advanced" />
        </Tabs>

        {tab === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Compile builds firmware on the server. Install OTA sends it to a device that is
              already on the network. First-time install uses USB — download flash-ready YAML
              below, then open web.esphome.io with the device plugged in.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" disabled={busy} onClick={() => void runCompile()}>
                Compile firmware
              </Button>
              <Button variant="outlined" disabled={busy} onClick={() => void runUpload()}>
                Install OTA
              </Button>
              <Button
                variant="outlined"
                disabled={busy}
                startIcon={<DownloadRoundedIcon />}
                onClick={() => void runDownloadFlashYaml()}
              >
                Download flash YAML
              </Button>
              <Button
                variant="outlined"
                href="https://web.esphome.io"
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewRoundedIcon />}
              >
                web.esphome.io
              </Button>
            </Stack>
            {log ? (
              <TextField
                value={log}
                multiline
                minRows={10}
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            ) : null}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <Alert severity="warning">
              Manual YAML edits make the configuration authoritative. The Device Builder may not
              be able to edit this device again.
            </Alert>
            {managementMode === "advanced" && (
              <Typography variant="caption" color="text.secondary">
                Management mode: advanced
              </Typography>
            )}
            {yamlPath && (
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {yamlPath}
              </Typography>
            )}
            <TextField
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              multiline
              minRows={14}
              fullWidth
              disabled={busy}
              sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={busy} onClick={() => void runValidate()}>
                Validate
              </Button>
              <Button variant="contained" disabled={busy} onClick={() => void runSaveYaml()}>
                Save YAML
              </Button>
            </Stack>
            {log && tab === 1 ? (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Log
                </Typography>
                <TextField
                  value={log}
                  multiline
                  minRows={4}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                />
              </Box>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
