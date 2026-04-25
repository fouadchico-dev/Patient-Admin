import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// MUI
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


type Doctor = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active: boolean;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  active: boolean;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  active: true,
};

export default function Doctors() {
  const nav = useNavigate();
  const [session, setSession] = useState<any>(null);

  const [q, setQ] = useState("");

  // list + selection
  const [items, setItems] = useState<Doctor[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  // ui state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  // 1) Initial load + auth check
  useEffect(() => {
    (async () => {
      const me = await window.api.auth.me();
      if (!me) {
        nav("/login");
        return;
      }
      setSession(me);

      await loadAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ✅ 2) Debounced search (when q changes)
  useEffect(() => {
    const t = setTimeout(() => {
      loadAll(q);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);




  const loadAll = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      //const list: Doctor[] = await window.api.doctors.list(query || "");
      const list: Doctor[] = await window.api.doctors.list((query ?? "").trim());
      setItems(list);
      if (selectedId && !list.some((x) => x.id === selectedId)) setSelectedId("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setMode("create");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setMode("edit");
    setForm({
      firstName: selected.firstName ?? "",
      lastName: selected.lastName ?? "",
      email: selected.email ?? "",
      phone: selected.phone ?? "",
      notes: selected.notes ?? "",
      active: selected.active ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        active: !!form.active,
      };

      if (!payload.firstName || !payload.lastName) {
        setError("Voornaam en achternaam zijn verplicht.");
        return;
      }

      if (mode === "create") {
        const created: Doctor = await window.api.doctors.create(payload);
        setSelectedId(created.id);
      } else {
        if (!selected) return;
        await window.api.doctors.update(selected.id, payload);
      }

      closeModal();
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  
const deactivate = async () => {
    if (!selected) return;
    if (!confirm(`Doctor deactiveren: ${selected.lastName}, ${selected.firstName}?`)) return;

    setError(null);
    try {
      await window.api.doctors.remove(selected.id);
      setSelectedId("");
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Deactivate failed");
    }
  };

/*
  const remove = async () => {
    if (!selected) return;
    if (!confirm(`Doctor deactiveren: ${selected.lastName}, ${selected.firstName}?`)) return;

    setError(null);
    try {
      await window.api.doctors.remove(selected.id);
      setSelectedId("");
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  };
*/



const selectedLabel = selected ? `${selected.lastName}, ${selected.firstName}` : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Doctors
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Logged in as: {session?.username ?? "-"} ({session?.role ?? "-"})
          </Typography>
        </Box>

        {/* Search bar */}
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            sx={{ alignItems: { xs: "stretch", sm: "center" } }}
          >
            <TextField
              size="small"
              label="Zoeken"
              placeholder="Naam / email / telefoon…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 320 } }}
            />
            <Button variant="contained" onClick={() => loadAll(q)}>
              Zoeken
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setQ("");
                loadAll("");
              }}
            >
              Reset
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { sm: "auto" } }}>
              {loading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                {loading ? "Laden…" : `${items.length} doctors`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
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
            {selected && <Chip label={`Geselecteerd: ${selectedLabel}`} size="small" />}
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {/* List */}
      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 600 }}>Lijst</Typography>
        </Box>
        <Divider />

        {items.map((d) => {
          const isSelected = d.id === selectedId;

          return (
            <Box
              key={d.id}
              onClick={() => setSelectedId(d.id)}
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
                    {d.lastName}, {d.firstName}{" "}
                    {!d.active && <Chip label="inactive" size="small" sx={{ ml: 1 }} />}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {d.email ?? "-"} · {d.phone ?? "-"}
                  </Typography>
                </Box>

                {isSelected && <Chip label="✓" size="small" color="primary" />}
              </Box>
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Geen doctors gevonden.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Modal */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe doctor" : "Doctor bewerken"}</DialogTitle>

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

            <Button
              variant={form.active ? "contained" : "outlined"}
              color={form.active ? "success" : "inherit"}
              onClick={() => setForm((s) => ({ ...s, active: !s.active }))}
              sx={{ alignSelf: "flex-start" }}
            >
              {form.active ? "Active: Ja" : "Active: Nee"}
            </Button>
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

