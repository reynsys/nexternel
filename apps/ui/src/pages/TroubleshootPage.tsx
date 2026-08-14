import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  api,
  getStoredAccessToken,
  type ServerDiagnostics,
} from "../api";
import { buildClientSnapshot, type ClientSnapshot } from "../diagnostics/buildClientSnapshot";
import { clearDiagnosticErrors } from "../diagnostics/errorRing";
import {
  formatDiagnosticsReport,
  type AuthExtras,
} from "../diagnostics/formatReport";
import { copyTextToClipboard, downloadTextFile } from "../lib/copyText";
import {
  clearVisualScan,
  loadVisualScan,
  type VisualScanResult,
} from "../diagnostics/visualProbe";
import {
  isVisualDiagEnabled,
  setVisualDiagEnabled,
  VISUAL_DIAG_CHANGED,
} from "../diagnostics/visualDiagPrefs";

export function TroubleshootPage() {
  const [client, setClient] = useState<ClientSnapshot | null>(null);
  const [server, setServer] = useState<ServerDiagnostics | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthExtras | null>(null);
  const [visual, setVisual] = useState<VisualScanResult | null>(() => loadVisualScan());
  const [visualFabOn, setVisualFabOn] = useState(() => isVisualDiagEnabled());
  const [report, setReport] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setVisualFabOn(isVisualDiagEnabled());
    window.addEventListener(VISUAL_DIAG_CHANGED, sync);
    return () => window.removeEventListener(VISUAL_DIAG_CHANGED, sync);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setCopyStatus(null);

    let serverData: ServerDiagnostics | null = null;
    let sErr: string | null = null;
    try {
      serverData = await api.diagnostics();
      setServer(serverData);
      setServerError(null);
    } catch (err) {
      sErr = err instanceof Error ? err.message : String(err);
      setServer(null);
      setServerError(sErr);
    }

    let authExtras: AuthExtras | null = null;
    if (getStoredAccessToken()) {
      try {
        const [me, caps] = await Promise.all([api.me(), api.capabilities()]);
        authExtras = {
          meUsername: me.user.username,
          capabilitiesCount: caps.capabilities.length,
        };
      } catch (err) {
        authExtras = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    setAuth(authExtras);

    const snap = buildClientSnapshot();
    setClient(snap);

    const visualScan = loadVisualScan();
    setVisual(visualScan);

    setReport(
      formatDiagnosticsReport(
        snap,
        serverData ? serverData : sErr ? { error: sErr } : null,
        authExtras,
        visualScan
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function copyReport() {
    const ok = await copyTextToClipboard(report);
    setCopyStatus(
      ok
        ? "Copied — paste wherever you need help (support chat, ticket, email)"
        : "Copy failed — use Download .txt or select the report text manually"
    );
  }

  function downloadReport() {
    downloadTextFile(
      `nexternel-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
      report
    );
  }

  function clearErrors() {
    clearDiagnosticErrors();
    void refresh();
  }

  function clearVisual() {
    clearVisualScan();
    setVisual(null);
    void refresh();
  }

  const serverOk = server?.status === "ok";
  const randomOk = client?.randomUuid === "ok";
  const visualProblems =
    visual?.elements.filter(
      (e) =>
        e.flags.zeroSize ||
        e.flags.clippedOverflow ||
        e.flags.offscreen ||
        e.flags.undersizedChart
    ).length ?? 0;

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Troubleshoot</Typography>
      <Typography color="text.secondary">
        Build a report of browser and server status to share when something goes wrong.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={
            client
              ? `secureContext: ${client.isSecureContext}`
              : "secureContext: …"
          }
          color={client?.isSecureContext ? "success" : "warning"}
        />
        <Chip
          size="small"
          label={client ? `randomUUID: ${client.randomUuid}` : "randomUUID: …"}
          color={randomOk ? "success" : "warning"}
        />
        <Chip
          size="small"
          label={
            serverError
              ? `API: ${serverError}`
              : server
                ? `API: ${server.status} · ${server.version}`
                : "API: …"
          }
          color={serverError ? "error" : serverOk ? "success" : "warning"}
        />
        <Chip
          size="small"
          label={client?.accessTokenPresent ? "signed in" : "not signed in"}
          variant="outlined"
        />
        <Chip
          size="small"
          label={`errors: ${client?.recentErrors.length ?? 0}`}
          color={(client?.recentErrors.length ?? 0) > 0 ? "warning" : "default"}
        />
        <Chip
          size="small"
          label={
            visual
              ? `visual: ${visual.matchCount} els · ${visualProblems} flagged`
              : "visual: none"
          }
          color={visualProblems > 0 ? "warning" : visual ? "success" : "default"}
        />
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="contained" disabled={loading} onClick={() => void refresh()}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
        <Button variant="outlined" disabled={!report} onClick={() => void copyReport()}>
          Copy report
        </Button>
        <Button variant="outlined" disabled={!report} onClick={downloadReport}>
          Download .txt
        </Button>
        <Button onClick={clearErrors}>Clear error log</Button>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Visual diagnostic
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Measures the size and clipping of boxes on screen (the browser&apos;s layout tree of
            HTML elements — often called the <strong>DOM</strong>). Use it when a widget looks
            cut off, empty, or the wrong size.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            1. Click <strong>Show on pages</strong> below (turns on the floating button for this
            browser session).
            <br />
            2. Open the page that has the problem (Dashboard, Live, or any other screen — not
            this Troubleshoot page).
            <br />
            3. Use the floating <strong>Visual Diagnostic</strong> button (bottom-right) →{" "}
            <strong>Scan this page</strong> or <strong>Pick element</strong>.
            <br />
            4. Return here → <strong>Refresh</strong> → <strong>Copy report</strong>.
            <br />
            5. When finished, use <strong>Hide on pages</strong> (or “Hide until needed” on the
            floating panel).
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant={visualFabOn ? "outlined" : "contained"}
              onClick={() => setVisualDiagEnabled(true)}
              disabled={visualFabOn}
            >
              Show on pages
            </Button>
            <Button
              variant="outlined"
              onClick={() => setVisualDiagEnabled(false)}
              disabled={!visualFabOn}
            >
              Hide on pages
            </Button>
            <Button onClick={clearVisual} disabled={!visual}>
              Clear visual scan
            </Button>
          </Stack>
          <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
            Floating button: {visualFabOn ? "on (this session)" : "off"}
          </Typography>
          {visual ? (
            <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
              Last scan: {visual.href} · {visual.matchCount} matches · mode={visual.mode}
              {visual.warnings[0] ? ` · ${visual.warnings[0]}` : ""}
            </Typography>
          ) : (
            <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
              No visual scan yet — enable Show on pages, run Visual Diagnostic on the page that
              has the issue, then Refresh.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Developer tools
          </Typography>
          <Button component={RouterLink} to="/troubleshoot/panel-preview" variant="outlined">
            Panel preview
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
            Test panel types against live capabilities. Operators add panels on Dashboards.
          </Typography>
        </CardContent>
      </Card>

      {copyStatus && <Alert severity="success">{copyStatus}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Report (copy and share)
          </Typography>
          <TextField
            value={report}
            onChange={(e) => setReport(e.target.value)}
            fullWidth
            multiline
            minRows={18}
            maxRows={32}
            InputProps={{
              sx: {
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 13,
              },
            }}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
