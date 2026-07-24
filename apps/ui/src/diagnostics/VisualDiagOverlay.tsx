import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DEFAULT_VISUAL_SELECTORS,
  loadVisualScan,
  saveVisualScan,
  scanElementTree,
  scanVisual,
  type VisualScanResult,
} from "./visualProbe";
import {
  isVisualDiagEnabled,
  setVisualDiagEnabled,
  VISUAL_DIAG_CHANGED,
} from "./visualDiagPrefs";

/**
 * Floating visual diagnostics — only when enabled from Troubleshoot
 * (session-scoped). Hidden on the Troubleshoot page itself.
 */
export function VisualDiagOverlay() {
  const location = useLocation();
  const onTroubleshoot = location.pathname === "/troubleshoot";

  const [enabled, setEnabled] = useState(() => isVisualDiagEnabled());
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [selector, setSelector] = useState(DEFAULT_VISUAL_SELECTORS);
  const [last, setLast] = useState<VisualScanResult | null>(() => loadVisualScan());
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setEnabled(isVisualDiagEnabled());
    window.addEventListener(VISUAL_DIAG_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(VISUAL_DIAG_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (onTroubleshoot) {
      setOpen(false);
      setPicking(false);
    }
  }, [onTroubleshoot]);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      setPicking(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!picking) return;

    const onClick = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = ev.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-nx-visual-diag]")) return;

      const result = scanElementTree(target);
      saveVisualScan(result);
      setLast(result);
      setPicking(false);
      setStatus(
        `Picked ${result.elements.length} nodes (${result.warnings.join("; ") || "ok"}). Open Troubleshoot → Refresh to add this to the report.`
      );
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setPicking(false);
        setStatus("Pick cancelled");
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    document.body.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
      document.body.style.cursor = "";
    };
  }, [picking]);

  if (onTroubleshoot || !enabled) {
    return null;
  }

  function runScan() {
    const result = scanVisual(selector.trim() || DEFAULT_VISUAL_SELECTORS, "selector");
    saveVisualScan(result);
    setLast(result);
    setStatus(
      `Scanned ${result.matchCount} match(es). ${result.warnings[0] ?? "Open Troubleshoot → Refresh to add this to the report."}`
    );
  }

  return (
    <>
      <Button
        data-nx-visual-diag
        variant="contained"
        size="small"
        onClick={() => setOpen((o) => !o)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 1400,
          textTransform: "none",
        }}
      >
        Visual Diagnostic
      </Button>

      {open && (
        <Paper
          data-nx-visual-diag
          elevation={8}
          sx={{
            position: "fixed",
            right: 16,
            bottom: 56,
            zIndex: 1400,
            width: { xs: "calc(100vw - 32px)", sm: 360 },
            maxHeight: "70vh",
            overflow: "auto",
            p: 1.5,
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Visual Diagnostic</Typography>
            <Typography variant="caption" color="text.secondary">
              Measures on-screen layout boxes — HTML elements the browser draws (the DOM):
              size, overflow, clipping. Use on the page that has the problem (Dashboard, Live,
              or any other screen), then open Troubleshoot to copy the report.
            </Typography>
            <TextField
              size="small"
              label="CSS selector (advanced)"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="contained" onClick={runScan}>
                Scan this page
              </Button>
              <Button
                size="small"
                variant={picking ? "contained" : "outlined"}
                color={picking ? "warning" : "primary"}
                onClick={() => {
                  setPicking(true);
                  setStatus("Click an element on this page (Esc to cancel)");
                }}
              >
                {picking ? "Click an element…" : "Pick element"}
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setVisualDiagEnabled(false);
                  setStatus(null);
                }}
              >
                Hide until needed
              </Button>
              <Button size="small" onClick={() => setOpen(false)}>
                Close
              </Button>
            </Stack>
            {status && (
              <Typography variant="caption" color="text.secondary">
                {status}
              </Typography>
            )}
            {last && (
              <Box
                sx={{
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  fontSize: 11,
                  bgcolor: "action.hover",
                  p: 1,
                  borderRadius: 1,
                  maxHeight: 180,
                  overflow: "auto",
                }}
              >
                {last.matchCount} matches · {last.warnings.length} warnings
                <br />
                {last.elements.slice(0, 5).map((e, i) => (
                  <div key={i}>
                    {e.rect.width}×{e.rect.height}
                    {e.flags.zeroSize || e.flags.clippedOverflow
                      ? ` ⚠ ${[
                          e.flags.zeroSize && "zero",
                          e.flags.clippedOverflow && "clip",
                        ]
                          .filter(Boolean)
                          .join(",")}`
                      : ""}{" "}
                    {e.path.slice(0, 60)}
                  </div>
                ))}
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
}
