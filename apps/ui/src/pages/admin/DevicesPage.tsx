import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../../api";

export function DevicesPage() {
  const [devices, setDevices] = useState<
    {
      id: string;
      name: string;
      slug: string;
      isOnline: boolean;
      roomId: string | null;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    try {
      const [res, me] = await Promise.all([api.devices(), api.me()]);
      setDevices(res.devices);
      setIsAdmin(me.user.role === "admin");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function sync() {
    setBusy(true);
    setSyncMsg(null);
    try {
      const res = await api.syncCapabilities();
      setSyncMsg(`Synced ${res.sensors} sensors, ${res.relays} relays`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Devices</Typography>
        {isAdmin && (
          <Button variant="contained" disabled={busy} onClick={() => void sync()}>
            {busy ? "Syncing…" : "Sync capabilities"}
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary">
        Read-only device list. Sync rebuilds capabilities from V2 sensors/relays.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {syncMsg && <Alert severity="success">{syncMsg}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Slug</TableCell>
            <TableCell>Online</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.name}</TableCell>
              <TableCell>{d.slug}</TableCell>
              <TableCell>{d.isOnline ? "yes" : "no"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
