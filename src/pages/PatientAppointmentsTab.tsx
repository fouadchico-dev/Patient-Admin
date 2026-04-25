import { useEffect, useMemo, useState } from "react";
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
import AppointmentNotesPanel from "./AppointmentNotesPanel";

declare global {
  interface Window {
    api: any;
  }
}

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  active?: boolean;
};

type Project = { id: string; name: string };

type Appointment = {
  id: string;
  title: string;
  notes?: string | null;
  start: string;
  end: string;
  status?: string | null;
  patientId: string;
  staffId?: string | null;
  projectId?: string | null;
  treatmentPlanItemId?: string | null;
  staff?: Staff | null;
  project?: Project | null;
  treatmentPlanItem?: { id: string; title: string } | null;
};

type FormState = {
  title: string;
  notes: string;
  status: string;
  start: string; // datetime-local
  end: string; // datetime-local
  staffId: string;
  projectId: string;
  treatmentPlanItemId: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormState {
  const start = new Date();
  const end = new Date(Date.now() + 30 * 60 * 1000);
  return {
    title: "Afspraak",
    notes: "",
    status: "scheduled",
    start: toDatetimeLocal(start),
    end: toDatetimeLocal(end),
    staffId: "",
    projectId: "",
    treatmentPlanItemId: "",
  };
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Gepland" },
  { value: "done", label: "Afgerond" },
  { value: "canceled", label: "Geannuleerd" },
];

export default function PatientAppointmentsTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [treatmentItems, setTreatmentItems] = useState<{ id: string; title: string; status: string }[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(() => emptyForm());

  // Add note dialog (for the selected appointment)
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const s: Staff[] = await window.api.staff.list();
      const pr: Project[] = await window.api.projects.list();
      setStaff((s || []).filter((x) => x.active !== false));
      setProjects(pr || []);

      if (window.api.patientTreatmentPlan?.listByPatient) {
        try {
          const t = await window.api.patientTreatmentPlan.listByPatient(patientId);
          setTreatmentItems(
            (t || [])
              .filter((i: any) => i.status === "OPEN" || i.status === "IN_PROGRESS")
              .map((i: any) => ({ id: i.id, title: i.title, status: i.status }))
          );
        } catch {
          setTreatmentItems([]);
        }
      }

      const startISO = new Date(2000, 0, 1).toISOString();
      const endISO = new Date(2100, 0, 1).toISOString();
      const list: Appointment[] = await window.api.appointments.range(startISO, endISO, { patientId });
      const sorted = (list || []).slice().sort((a, b) => +new Date(b.start) - +new Date(a.start));
      setItems(sorted);

      if (selectedId && !sorted.some((x) => x.id === selectedId)) setSelectedId("");
    } catch (e: any) {
      setError(e?.message ?? "Kon afspraken niet laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const openCreate = () => {
    setMode("create");
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setMode("edit");
    setForm({
      title: selected.title ?? "",
      notes: selected.notes ?? "",
      status: selected.status ?? "scheduled",
      start: toDatetimeLocal(new Date(selected.start)),
      end: toDatetimeLocal(new Date(selected.end)),
      staffId: selected.staffId ?? "",
      projectId: selected.projectId ?? "",
      treatmentPlanItemId: selected.treatmentPlanItemId ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);
    try {
      const title = form.title.trim();
      if (!title) return setError("Titel is verplicht");

      const start = new Date(form.start);
      const end = new Date(form.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError("Ongeldige start/eind datum");
      if (end <= start) return setError("Eind moet na start liggen");

      const payload: any = {
        title,
        notes: form.notes.trim() || null,
        status: form.status || null,
        start,
        end,
        patientId,
        staffId: form.staffId || null,
        projectId: form.projectId || null,
        treatmentPlanItemId: form.treatmentPlanItemId || null,
      };

      if (mode === "create") {
        const created: Appointment = await window.api.appointments.create(payload);
        setSelectedId(created.id);
      } else {
        if (!selected) return;
        await window.api.appointments.update(selected.id, payload);
      }

      closeModal();
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? "Opslaan mislukt");
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm(`Afspraak verwijderen: "${selected.title}"?`)) return;
    setError(null);
    try {
      await window.api.appointments.remove(selected.id);
      setSelectedId("");
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? "Verwijderen mislukt");
    }
  };

  const saveNewAppointmentNote = async () => {
    try {
      if (!selected?.id) return;
      if (!noteText.trim()) return;

      // Create note linked to appointment
      await window.api.patientNotes.create({
        patientId,
        appointmentId: selected.id,
        type: "CONSULT",
        content: noteText,
        performedAt: new Date().toISOString(),
      });

      setNoteOpen(false);
      setNoteText("");
      // force reload of notes panels
      setNotesRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message ?? "Notitie opslaan mislukt");
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Afspraken</Typography>
        {loading && <CircularProgress size={18} />}
        <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={openCreate}>Nieuw</Button>
          <Button variant="outlined" onClick={openEdit} disabled={!selected}>Bewerken</Button>
          <Button variant="outlined" color="error" onClick={remove} disabled={!selected}>Verwijderen</Button>
          <Button variant="outlined" onClick={loadAll} disabled={loading}>Vernieuwen</Button>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 600 }}>Lijst</Typography>
          <Typography variant="body2" color="text.secondary">{items.length} afspraken</Typography>
        </Box>
        <Divider />

        {items.map((a) => {
          const isSel = a.id === selectedId;
          const staffName = a.staff ? `${a.staff.lastName}, ${a.staff.firstName}` : "(geen medewerker)";
          const projectName = a.project ? a.project.name : "";
          return (
            <Box
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              onDoubleClick={openEdit}
              sx={{
                px: 2,
                py: 1.25,
                cursor: "pointer",
                bgcolor: isSel ? "action.selected" : "background.paper",
                "&:hover": { bgcolor: isSel ? "action.selected" : "action.hover" },
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>
                {a.title}
                {a.status ? <Chip label={a.status} size="small" sx={{ ml: 1 }} /> : null}
                {a.treatmentPlanItemId ? <Chip label="📌 Zorgplan" size="small" color="info" sx={{ ml: 1 }} /> : null}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(a.start).toLocaleString()} → {new Date(a.end).toLocaleString()} · {staffName}
                {projectName ? ` · ${projectName}` : ""}
              </Typography>
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">Nog geen afspraken.</Typography>
          </Box>
        )}
      </Paper>

      {/* Notes for selected appointment (below list) */}
      {selected?.id ? <AppointmentNotesPanel key={notesRefreshKey} appointmentId={selected.id} /> : null}

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe afspraak" : "Afspraak bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Titel" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} fullWidth />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Medewerker (optioneel)"
                select
                value={form.staffId}
                onChange={(e) => setForm((s) => ({ ...s, staffId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">(geen)</MenuItem>
                {staff.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.lastName}, {s.firstName}{s.role ? ` (${s.role})` : ""}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Project (optioneel)"
                select
                value={form.projectId}
                onChange={(e) => setForm((s) => ({ ...s, projectId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">(geen)</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Zorgplan item (optioneel)"
                select
                value={form.treatmentPlanItemId}
                onChange={(e) => setForm((s) => ({ ...s, treatmentPlanItemId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">— Geen koppeling —</MenuItem>
                {treatmentItems.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.title} ({t.status})</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Status"
                select
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Start"
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm((s) => ({ ...s, start: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Eind"
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm((s) => ({ ...s, end: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>

            <TextField
              label="Notities (optioneel)"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            {/* Notes inside edit dialog */}
            {mode === "edit" && selected?.id ? <AppointmentNotesPanel key={notesRefreshKey + 1} appointmentId={selected.id} /> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          {mode === "edit" && selected?.id ? (
            <Button
              variant="outlined"
              onClick={() => {
                setNoteText("");
                setNoteOpen(true);
              }}
            >
              Nieuwe notitie
            </Button>
          ) : null}
          <Button variant="outlined" onClick={closeModal}>Annuleren</Button>
          <Button variant="contained" onClick={save}>Opslaan</Button>
        </DialogActions>
      </Dialog>

      {/* New note dialog */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Nieuwe notitie (Consult)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Notitie"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              multiline
              minRows={6}
              fullWidth
            />
            <Alert severity="info">
              Deze notitie wordt gekoppeld aan de huidige afspraak.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setNoteOpen(false)}>Annuleren</Button>
          <Button variant="contained" onClick={saveNewAppointmentNote}>Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
