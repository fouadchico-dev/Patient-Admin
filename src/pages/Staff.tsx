import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// MUI
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

declare global {
  interface Window {
    api: any;
  }
}

type Role = {
  id: string;
  name: "DOCTOR" | "ASSISTANT" | "MANAGER" | "ADMIN" | string;
};

type StaffItem = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active: boolean;

    // from include in IPC (recommended)
    user?: {
    id: string;
    username: string;
    active: boolean;
    roles?: Array<{ role: Role }>;
  } | null;
};

type ListFilters = {
  roleName?: string;   // "", DOCTOR, ASSISTANT, MANAGER, ADMIN
  activeOnly?: boolean;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  active: boolean;

  username: string;
  password: string; // only used when creating or resetting password
  roles: string[];  // role names
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  active: true,

  username: "",
  password: "",
  roles: [], // must have >= 1
};

function roleLabel(role: string) {
  return role;
}

function staffLabel(s: StaffItem) {
  return `${s.lastName}, ${s.firstName}`;
}

export default function Staff() {
  const nav = useNavigate();

  const [session, setSession] = useState<any>(null);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<ListFilters>({
    roleName: "",
    activeOnly: true,
  });

  const [roles, setRoles] = useState<Role[]>([]);

  const [items, setItems] = useState<StaffItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    (async () => {
      const me = await window.api.auth.me();
      if (!me) {
        nav("/login");
        return;
      }
      setSession(me);

      const r: Role[] = await window.api.roles.list();
      setRoles(r || []);

      await loadAll("", { roleName: "", activeOnly: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => loadAll(q, filters), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // reload when filters change
  useEffect(() => {
    loadAll(q, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.roleName, filters.activeOnly]);

  const loadAll = async (query?: string, f?: ListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const list: StaffItem[] = await window.api.staff.list((query ?? "").trim(), {
        roleName: f?.roleName || undefined,
        activeOnly: !!f?.activeOnly,
      });

      setItems(list || []);
      if (selectedId && !(list || []).some((x: StaffItem) => x.id === selectedId)) {
        setSelectedId("");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };


  const openCreate = () => {
    setMode("create");
    setForm({ ...emptyForm, active: true, roles: [] });
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;

    const currentRoles =
      selected.user?.roles?.map((ur: any) => ur.role?.name).filter(Boolean) ?? [];

    setMode("edit");
    setForm({
      firstName: selected.firstName ?? "",
      lastName: selected.lastName ?? "",
      email: selected.email ?? "",
      phone: selected.phone ?? "",
      notes: selected.notes ?? "",
      active: selected.active ?? true,

      username: selected.user?.username ?? "",
      password: "",
      roles: currentRoles as string[],
    });

    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);

    try {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        return setError("Voornaam en achternaam zijn verplicht.");
      }
      if (!form.username.trim()) {
        return setError("Username is verplicht.");
      }
      if (mode === "create" && !form.password.trim()) {
        return setError("Password is verplicht bij nieuwe staff.");
      }
      if (!form.roles || form.roles.length < 1) {
        return setError("Selecteer minimaal 1 rol.");
      }

      const payload: any = {
        staff: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
          active: !!form.active,
        },
        user: {
          username: form.username.trim(),
          password: form.password.trim() || undefined, // only if set
          active: true,
        },
        roles: form.roles, // array of role names
      };

      if (mode === "create") {
        const created: StaffItem = await window.api.staff.create(payload);
        setSelectedId(created.id);
      } else {
        if (!selected) return;
        await window.api.staff.update(selected.id, payload);
      }

      closeModal();
      await loadAll(q, filters);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const deactivate = async () => {
    if (!selected) return;
    if (!confirm(`Staff deactiveren: ${staffLabel(selected)}?`)) return;

    setError(null);
    try {
      await window.api.staff.deactivate(selected.id);
      setSelectedId("");
      await loadAll(q, filters);
    } catch (e: any) {
      setError(e?.message ?? "Deactivate failed");
    }
  };


return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header + Search + Filters */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Staff
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Logged in as: {session?.username ?? "-"}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.25}
            sx={{ alignItems: { xs: "stretch", md: "center" } }}
          >
            <TextField
              size="small"
              label="Zoeken"
              placeholder="Naam / email / telefoon…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: { xs: "100%", md: 260 } }}
            />

            <TextField
              size="small"
              select
              label="Rol filter"
              value={filters.roleName ?? ""}
              onChange={(e) => setFilters((s) => ({ ...s, roleName: e.target.value }))}
              sx={{ minWidth: { xs: "100%", md: 180 } }}
            >
              <MenuItem value="">Alle rollen</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.name}>
                  {roleLabel(r.name)}
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!filters.activeOnly}
                  onChange={(e) => setFilters((s) => ({ ...s, activeOnly: e.target.checked }))}
                />
              }
              label="Alleen actief"
            />

            <Button variant="outlined" onClick={() => loadAll(q, filters)}>
              Vernieuwen
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { md: "auto" } }}>
              {loading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                {loading ? "Laden…" : `${items.length} staff`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
          <Button variant="contained" onClick={openCreate}>
            Nieuw
          </Button>

          <Button variant="contained" color="inherit" onClick={openEdit} disabled={!selected}>
            Bewerken
          </Button>

          <Button variant="contained" color="error" onClick={deactivate} disabled={!selected}>
            Deactiveren
          </Button>

          <Box sx={{ ml: { sm: "auto" }, display: "flex", alignItems: "center", gap: 1 }}>
            {selected && (
              <Chip
                label={`Geselecteerd: ${staffLabel(selected)}`}
                size="small"
              />
            )}
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {/* List */}
      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Lijst</Typography>
        </Box>
        <Divider />

        {items.map((s) => {
          const isSelected = s.id === selectedId;
          const roleNames =
            s.user?.roles?.map((ur: any) => ur.role?.name).filter(Boolean) ?? [];

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
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {staffLabel(s)} {!s.active && <Chip label="inactive" size="small" sx={{ ml: 1 }} />}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.user?.username ?? "-"} · {s.email ?? "-"} · {s.phone ?? "-"}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.75 }}>
                    {roleNames.length === 0 ? (
                      <Chip label="(no roles)" size="small" variant="outlined" />
                    ) : (
                      roleNames.map((r: string) => (
                        <Chip key={r} label={r} size="small" />
                      ))
                    )}
                  </Box>
                </Box>

                {isSelected && <Chip label="✓" size="small" color="primary" />}
              </Box>
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Geen staff gevonden.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Modal */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe staff" : "Staff bewerken"}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Voornaam"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Achternaam"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Telefoon"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                fullWidth
              />
            </Stack>

            <TextField
              label="Notities"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <Divider />

            <Typography sx={{ fontWeight: 600 }}>Login</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Username"
                value={form.username}
                onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                fullWidth
              />
              <TextField
                label={mode === "create" ? "Password" : "Nieuw password (optioneel)"}
                type="password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                fullWidth
              />
            </Stack>

            
                <TextField
                label="Rollen (min 1)"
                select
                value={form.roles}
                onChange={(e) => setForm((s) => ({ ...s, roles: e.target.value as unknown as string[] }))}
                helperText="Kies één of meerdere rollen. ADMIN mag gecombineerd worden."
                fullWidth
                slotProps={{
                    select: {
                    multiple: true,
                    renderValue: (selected) => (selected as string[]).join(", "),
                    },
                }}
                >
                {roles.map((r) => (
                    <MenuItem key={r.id} value={r.name}>
                    <Checkbox checked={form.roles.indexOf(r.name) > -1} />
                    {r.name}
                    </MenuItem>
                ))}
                </TextField>


            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.active}
                  onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
                />
              }
              label="Staff actief"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeModal} variant="outlined">
            Annuleren
          </Button>
          <Button onClick={save} variant="contained">
            Opslaan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



