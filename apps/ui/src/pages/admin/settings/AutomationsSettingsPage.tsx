import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Typography } from "@mui/material";
import { api } from "../../../api";
import { useContentSurfaceSx } from "../../../skins/useSurfaceStyles";

export function AutomationsSettingsPage() {
  const [nodeRedUrl, setNodeRedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const surfaceSx = useContentSurfaceSx();

  useEffect(() => {
    void api
      .system()
      .then((info) => setNodeRedUrl(info.nodeRedUrl))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load automation link")
      );
  }, []);

  return (
    <Card sx={surfaceSx}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Automations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create and manage flows in Node-RED — schedules, MQTT actions, and integrations with
          your devices.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {nodeRedUrl && (
          <Button
            variant="contained"
            href={nodeRedUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Node-RED
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
