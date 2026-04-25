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

declare global {
  interface Window {
    api: any;
  }
}

type Gender = "MALE" | "FEMALE" | "UNKNOWN";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  gender?: Gender | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  allergies?: string | null;
  notes?: string | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  birthDate: string; // yyyy-mm-dd
  gender: Gender;
  address: string;
  city: string;
  country: string;
  allergies: string;
  notes: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "UNKNOWN",
  address: "",
  city: "",
  country: "",
  allergies: "",
  notes: "",
};

export default function Patients() {
  const nav = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [q, setQ] = useState("");

  const [items, setItems] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

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
      await loadAll("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadAll(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const loadAll = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list: Patient[] = await window.api.patients.list((query ?? "").trim());
      setItems(list || []);
      if (selectedId && !(list || []).some((x: Patient) => x.id === selectedId)) setSelectedId("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load patients");
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
      birthDate: selected.birthDate ? String(selected.birthDate).slice(0, 10) : "",
      gender: (selected.gender ?? "UNKNOWN") as Gender,
      address: selected.address ?? "",
      city: selected.city ?? "",
      country: selected.country ?? "",
      allergies: selected.allergies ?? "",
      notes: selected.notes ?? "",
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
        birthDate: form.birthDate ? new Date(form.birthDate) : null,
        gender: form.gender || "UNKNOWN",
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        allergies: form.allergies.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (!payload.firstName || !payload.lastName) {
        setError("Voornaam en achternaam zijn verplicht.");
        return;
      }

      if (mode === "create") {
        const created: Patient = await window.api.patients.create(payload);
        setSelectedId(created.id);
      } else {
        if (!selected) return;
        await window.api.patients.update(selected.id, payload);
      }

      closeModal();
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm(`Patient verwijderen: ${selected.lastName}, ${selected.firstName}?`)) return;
    setError(null);
    try {
      await window.api.patients.remove(selected.id);
      setSelectedId("");
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  };

  const selectedLabel = selected ? `${selected.lastName}, ${selected.firstName}` : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Patients</Typography>
          <Typography variant="body2" color="text.secondary">
            Logged in as: {session?.username ?? "-"} ({session?.role ?? "-"})
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
              size="small"
              label="Zoeken"
              placeholder="Naam / stad…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 320 } }}
            />
            <Button variant="contained" onClick={() => loadAll(q)}>Zoeken</Button>
            <Button variant="outlined" onClick={() => { setQ(""); loadAll(""); }}>Reset</Button>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { sm: "auto" } }}>
              {loading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                {loading ? "Laden…" : `${items.length} patients`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
          <Button variant="contained" onClick={openCreate}>Nieuw</Button>
          <Button variant="contained" color="inherit" onClick={openEdit} disabled={!selected}>Bewerken</Button>
          <Button variant="contained" color="error" onClick={remove} disabled={!selected}>Verwijderen</Button>
          <Box sx={{ ml: { sm: "auto" }, display: "flex", alignItems: "center", gap: 1 }}>
            {selected && <Chip label={`Geselecteerd: ${selectedLabel}`} size="small" />}
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5 }}><Typography sx={{ fontWeight: 600 }}>Lijst</Typography></Box>
        <Divider />

        {items.map((p) => {
          const isSelected = p.id === selectedId;
          return (
            <Box
              key={p.id}
              onClick={() => setSelectedId(p.id)}
             
              onDoubleClick={() => nav(`/patients/${p.id}`)}
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
                {p.lastName}, {p.firstName}
                {p.gender ? <Chip label={p.gender} size="small" sx={{ ml: 1 }} /> : null}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {p.birthDate ? String(p.birthDate).slice(0, 10) : "-"} · {p.city ?? "-"} · {p.country ?? "-"}
              </Typography>
              {p.allergies ? (
                <Typography variant="body2" color="text.secondary">
                  Allergieën: {p.allergies}
                </Typography>
              ) : null}
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">Geen patients gevonden.</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe patient" : "Patient bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Voornaam" value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} fullWidth />
              <TextField label="Achternaam" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} fullWidth />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Geboortedatum"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((s) => ({ ...s, birthDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Geslacht"
                select
                value={form.gender}
                onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value as Gender }))}
                fullWidth
              >
                <MenuItem value="UNKNOWN">Onbekend</MenuItem>
                <MenuItem value="MALE">Man</MenuItem>
                <MenuItem value="FEMALE">Vrouw</MenuItem>
                <MenuItem value="OTHER">Anders</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Adres" value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} fullWidth />
              <TextField label="Stad" value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} fullWidth />
            </Stack>

            <TextField label="Land" value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} fullWidth />

            <TextField
              label="Allergieën"
              value={form.allergies}
              onChange={(e) => setForm((s) => ({ ...s, allergies: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />

            <TextField
              label="Notities"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
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
