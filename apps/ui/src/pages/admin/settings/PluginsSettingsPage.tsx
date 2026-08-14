import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api, type PluginInfo } from "../../../api";
import { getWidgetContribution } from "../../../plugins/registry";
import { useContentSurfaceSx } from "../../../skins/useSurfaceStyles";

function widgetLabels(plugin: PluginInfo): string[] {
  const types = plugin.contributes.widgets ?? [];
  return types.map((type) => getWidgetContribution(type)?.label ?? type);
}

export function PluginsSettingsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const surfaceSx = useContentSurfaceSx();

  useEffect(() => {
    void api
      .plugins()
      .then((r) => {
        setPlugins(r.plugins);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load plugins")
      );
  }, []);

  const sorted = useMemo(
    () => [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
    [plugins]
  );

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (sorted.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Card sx={surfaceSx}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Installed plugins
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Plugin</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Content</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((plugin) => (
                <TableRow key={plugin.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {plugin.name}
                    </Typography>
                    {plugin.description ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {plugin.description}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {plugin.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={`v${plugin.version}`} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {widgetLabels(plugin).length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {widgetLabels(plugin).map((label) => (
                          <Chip key={`${plugin.id}-${label}`} size="small" label={label} />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
