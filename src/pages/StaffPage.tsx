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

type StaffRole = "DOCTOR" | "ASSISTANT";

type StaffRow = {
  id: string;
  role: StaffRole;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  role: StaffRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  active: boolean;
};

const emptyForm: FormState = {
  role: "DOCTOR",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  active: true,
};

type RoleFilter = "ALL" | StaffRole;

export default function StaffPage() {
  const nav = useNavigate();
  const { session } = useAuth();

  const userRole = useMemo<UserRole>(() => {
    const r = (session as any)?.role;
    if (r === "ADMIN" || r === "MANAGER" || r === "USER") return r;
    return "USER";
  }, [session]);

  const canManageStaff = userRole === "MANAGER" || userRole === "ADMIN";

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const filteredItems = useMemo(() => {
    if (roleFilter === "ALL") return items;
    return items.filter((x) => x.role === roleFilter);
  }, [items, roleFilter]);

  const selected = useMemo(
    () => filteredItems.find((x) => x.id === selectedId) ?? null,
    [filteredItems, selectedId]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  const ensureEndpoints = () => {
    if (!window.api?.staff?.list) throw new Error("staff.list endpoint ontbreekt");
    if (!window.api?.staff?.create) throw new Error("staff.create endpoint ontbreekt");
    if (!window.api?.staff?.update) throw new Error("staff.update endpoint ontbreekt");
    if (!window.api?.staff?.remove) throw new Error("staff.remove endpoint ontbreekt");
  };

  const loadAll = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list: StaffRow[] = await window.api.staff.list((query ?? "").trim());
      setItems(list || []);

      if (selectedId && !(list || []).some((x) => x.id === selectedId)) {
        setSelectedId("");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      nav("/login", { replace: true });
      return;
    }
    if (!canManageStaff) {
      setError("Je hebt geen rechten om staff te beheren.");
      return;
    }
    loadAll("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!canManageStaff) return;
    const t = setTimeout(() => loadAll(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, canManageStaff]);

  useEffect(() => {
    if (!selectedId) return;
    const exists = filteredItems.some((x) => x.id === selectedId);
    if (!exists) setSelectedId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const openCreate = () => {
    setMode("create");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setMode("edit");
    setForm({
      role: selected.role,
      firstName: selected.firstName ?? "",
      lastName: selected.lastName ?? "",
      email: selected.email ?? "",
      phone: selected.phone ?? "",
      notes: selected.notes ?? "",
      active: !!selected.active,
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);
    try {
      ensureEndpoints();
      if (!form.firstName.trim()) return setError("FIRSTNAME_REQUIRED");
      if (!form.lastName.trim()) return setError("LASTNAME_REQUIRED");

      const payload = {
        role: form.role,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
        active: form.active,
      };

      if (mode === "create") {
        const created: StaffRow = await window.api.staff.create(payload);
        setSelectedId(created.id);
        if (roleFilter !== "ALL" && roleFilter !== created.role) {
          setRoleFilter(created.role);
        }
      } else {
        if (!selected) return;
        await window.api.staff.update(selected.id, payload);
      }

      closeModal();
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const deactivate = async () => {
    if (!selected) return;
    if (!confirm(`Staff deactiveren: ${selected.lastName}, ${selected.firstName}?`)) return;

    setError(null);
    try {
      ensureEndpoints();
      await window.api.staff.remove(selected.id);
      setSelectedId("");
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Deactivate failed");
    }
  };

  const selectedLabel = selected ? `${selected.lastName}, ${selected.firstName}` : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Staff</Typography>
          <Typography variant="body2" color="text.secondary">Filter op Doctor/Assistant.</Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
              size="small"
              label="Zoeken"
              placeholder="Naam / email / telefoon…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 240 } }}
            />

            <TextField
              size="small"
              label="Rol"
              select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              sx={{ minWidth: { xs: "100%", sm: 180 } }}
            >
              <MenuItem value="ALL">Alle</MenuItem>
              <MenuItem value="DOCTOR">Doctor</MenuItem>
              <MenuItem value="ASSISTANT">Assistant</MenuItem>
            </TextField>

            <Button variant="contained" onClick={() => loadAll(q)}>Zoeken</Button>
            <Button variant="outlined" onClick={() => { setQ(""); setRoleFilter("ALL"); loadAll(""); }}>Reset</Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { sm: "auto" } }}>
              {loading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                {loading ? "Laden…" : `${filteredItems.length} staff`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {error && <Alert severity={error.startsWith("Je hebt geen") ? "warning" : "error"}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
          <Button variant="contained" onClick={openCreate} disabled={!canManageStaff}>Nieuw</Button>
          <Button variant="contained" color="inherit" onClick={openEdit} disabled={!selected || !canManageStaff}>Bewerken</Button>
          <Button variant="contained" color="error" onClick={deactivate} disabled={!selected || !canManageStaff}>Deactiveren</Button>

          <Box sx={{ ml: { sm: "auto" }, display: "flex", alignItems: "center", gap: 1 }}>
            {selected && (
              <>
                <Chip label={`Geselecteerd: ${selectedLabel}`} size="small" />
                <Chip label={selected.role} size="small" />
                {!selected.active && <Chip label="inactive" size="small" />}
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5 }}><Typography sx={{ fontWeight: 600 }}>Lijst</Typography></Box>
        <Divider />

        {filteredItems.map((s) => {
          const isSelected = s.id === selectedId;
          return (
            <Box
              key={s.id}
              onClick={() => setSelectedId(s.id)}
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
              <Typography sx={{ fontWeight: 600 }}>
                {s.lastName}, {s.firstName}
                <Chip label={s.role} size="small" sx={{ ml: 1 }} />
                {!s.active && <Chip label="inactive" size="small" sx={{ ml: 1 }} />}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(s.email ?? "-")} · {(s.phone ?? "-")}
              </Typography>
            </Box>
          );
        })}

        {!loading && filteredItems.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">Geen staff gevonden.</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe staff" : "Staff bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Rol" select value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as StaffRole }))} fullWidth>
              <MenuItem value="DOCTOR">DOCTOR</MenuItem>
              <MenuItem value="ASSISTANT">ASSISTANT</MenuItem>
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Voornaam" value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} fullWidth />
              <TextField label="Achternaam" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} fullWidth />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} fullWidth />
              <TextField label="Telefoon" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} fullWidth />
            </Stack>

            <TextField label="Notities" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} multiline minRows={3} fullWidth />

            <TextField label="Actief" select value={form.active ? "yes" : "no"} onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === "yes" }))} fullWidth>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} variant="outlined">Annuleren</Button>
          <Button onClick={save} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
