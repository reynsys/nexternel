import { useEffect, useState } from "react";
import {
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../../api";

export function RoomsPage() {
  const [rooms, setRooms] = useState<
    { id: string; name: string; description: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .rooms()
      .then((r) => setRooms(r.rooms))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load rooms")
      );
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Rooms</Typography>
      <Typography color="text.secondary">
        Read-only list from PostgreSQL. Create/edit rooms remains in V2 for now.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.description ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
