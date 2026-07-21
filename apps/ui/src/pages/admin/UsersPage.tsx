import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, type AdminUser } from "../../api";

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.users();
      setUsers(res.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createUser({
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        role,
      });
      setOpen(false);
      setUsername("");
      setPassword("");
      setDisplayName("");
      setRole("viewer");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: AdminUser) {
    try {
      await api.patchUser(u.id, { isActive: !u.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function setUserRole(u: AdminUser, next: "admin" | "viewer") {
    try {
      await api.patchUser(u.id, { role: next });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Users</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add user
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Display name</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.displayName ?? "—"}</TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={u.role}
                  onChange={(e) =>
                    void setUserRole(u, e.target.value as "admin" | "viewer")
                  }
                >
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="viewer">viewer</MenuItem>
                </Select>
              </TableCell>
              <TableCell>
                <Switch checked={u.isActive} onChange={() => void toggleActive(u)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={onCreate}>
          <DialogTitle>Add user</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="role">Role</InputLabel>
                <Select
                  labelId="role"
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
                >
                  <MenuItem value="viewer">viewer</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
