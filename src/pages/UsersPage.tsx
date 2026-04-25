import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth/AuthProvider";

declare global {
  interface Window {
    api: any;
  }
}

type UserRole = "USER" | "MANAGER" | "ADMIN";

type UserRow = {
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  username: string;
  role: UserRole;
  active: boolean;
  password: string; // used for create or reset
  resetPassword: boolean;
};

const emptyForm: FormState = {
  username: "",
  role: "MANAGER", // default for doctor/assistant logins (your choice)
  active: true,
  password: "",
  resetPassword: false,
};

export default function UsersPage() {
  const nav = useNavigate();
  const { session } = useAuth();

  const sessionRole = useMemo<UserRole>(() => {
    const r = (session as any)?.role;
    if (r === "ADMIN" || r === "MANAGER" || r === "USER") return r;
    return "USER";
  }, [session]);

  const isAdmin = sessionRole === "ADMIN";

  const [q, setQ] = useState("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadAll = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list: UserRow[] = await window.api.users.list((query ?? "").trim());
      setItems(list || []);
      if (selectedId && !(list || []).some((x) => x.id === selectedId)) setSelectedId("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      nav("/login", { replace: true });
      return;
    }
    if (!isAdmin) {
      setError("Alleen ADMIN mag Users beheren.");
      return;
    }
    loadAll("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => loadAll(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isAdmin]);

  const openCreate = () => {
    setMode("create");
    setForm({ ...emptyForm, resetPassword: true });
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setMode("edit");
    setForm({
      username: selected.username,
      role: selected.role,
      active: selected.active,
      password: "",
      resetPassword: false,
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);
    try {
      if (!form.username.trim()) return setError("USERNAME_REQUIRED");

      if (mode === "create") {
        if (!form.password.trim()) return setError("PASSWORD_REQUIRED");
        await window.api.users.create({
          username: form.username,
          password: form.password,
          role: form.role,
          active: form.active,
        });
      } else {
        if (!selected) return;
        await window.api.users.update(selected.id, {
          username: form.username,
          role: form.role,
          active: form.active,
          ...(form.resetPassword ? { password: form.password } : {}),
        });
      }

      closeModal();
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const deactivate = async () => {
    if (!selected) return;
    if (!confirm(`User deactiveren: ${selected.username}?`)) return;

    setError(null);
    try {
      await window.api.users.remove(selected.id);
      setSelectedId("");
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Deactivate failed");
    }
  };

  const selectedLabel = selected ? selected.username : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Users</Typography>
          <Typography variant="body2" color="text.secondary">
            Login accounts. Doctors/Assistants geef je rol MANAGER.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
              size="small"
              label="Zoeken"
              placeholder="Username…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 320 } }}
            />
            <Button variant="contained" onClick={() => loadAll(q)} disabled={!isAdmin}>Zoeken</Button>
            <Button variant="outlined" onClick={() => { setQ(""); loadAll(""); }} disabled={!isAdmin}>Reset</Button>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { sm: "auto" } }}>
              {loading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                {loading ? "Laden…" : `${items.length} users`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {error && <Alert severity={error.startsWith("Alleen") ? "warning" : "error"}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
          <Button variant="contained" onClick={openCreate} disabled={!isAdmin}>Nieuwe user</Button>
          <Button variant="contained" color="inherit" onClick={openEdit} disabled={!selected || !isAdmin}>Bewerken</Button>
          <Button variant="contained" color="error" onClick={deactivate} disabled={!selected || !isAdmin}>Deactiveren</Button>
          <Box sx={{ ml: { sm: "auto" }, display: "flex", alignItems: "center", gap: 1 }}>
            {selected && (
              <>
                <Chip label={`Geselecteerd: ${selectedLabel}`} size="small" />
                <Chip label={selected.role} size="small" color={selected.role === "ADMIN" ? "primary" : "default"} />
                {!selected.active && <Chip label="inactive" size="small" />}
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5 }}><Typography sx={{ fontWeight: 600 }}>Lijst</Typography></Box>
        <Divider />

        {items.map((u) => {
          const isSelected = u.id === selectedId;
          return (
            <Box
              key={u.id}
              onClick={() => setSelectedId(u.id)}
              onDoubleClick={openEdit}
              role="button"
              tabIndex={0}
              sx={{
                px: 2,
                py: 1.5,
                cursor: "pointer",
                bgcolor: isSelected ? "action.selected" : "background.paper",
                "&:hover": { bgcolor: isSelected ? "action.selected" : "action.hover" },
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {u.username} {!u.active && <Chip label="inactive" size="small" sx={{ ml: 1 }} />}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    role: {u.role} · updated: {String(u.updatedAt).slice(0, 19).replace("T", " ")}
                  </Typography>
                </Box>
                {isSelected && <Chip label="✓" size="small" color="primary" />}
              </Box>
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">Geen users gevonden.</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe user" : "User bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Rol"
              select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as UserRole }))}
              fullWidth
            >
              <MenuItem value="USER">USER</MenuItem>
              <MenuItem value="MANAGER">MANAGER</MenuItem>
              <MenuItem value="ADMIN">ADMIN</MenuItem>
            </TextField>

            <TextField
              label="Active"
              select
              value={form.active ? "yes" : "no"}
              onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === "yes" }))}
              fullWidth
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <Divider />

            {mode === "edit" && (
              <Alert severity="info">
                Wachtwoord reset is optioneel. Zet 'Reset password' aan als je een nieuw wachtwoord wilt opslaan.
              </Alert>
            )}

            {mode === "edit" && (
              <TextField
                label="Reset password"
                select
                value={form.resetPassword ? "yes" : "no"}
                onChange={(e) => setForm((s) => ({ ...s, resetPassword: e.target.value === "yes" }))}
                fullWidth
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
              </TextField>
            )}

            {(mode === "create" || form.resetPassword) && (
              <TextField
                label={mode === "create" ? "Password" : "New password"}
                type="password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} variant="outlined">Annuleren</Button>
          <Button onClick={save} variant="contained" disabled={!isAdmin}>Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
