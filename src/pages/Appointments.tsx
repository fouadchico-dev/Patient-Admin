import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppointmentNotesPanel from "./AppointmentNotesPanel";

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

type Patient = { id: string; firstName: string; lastName: string };

type Project = { id: string; name: string };

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  role: "DOCTOR" | "ASSISTANT" | string;
  active: boolean;
};

type Appointment = {
  id: string;
  title: string;
  notes?: string | null;
  start: string; // ISO
  end: string; // ISO
  status?: string | null;

  patientId: string;
  staffId?: string | null;
  projectId?: string | null;
  treatmentPlanItemId?: string | null;

  patient?: Patient;
  staff?: Staff | null;
  project?: Project | null;
};

type TreatmentPlanItem = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
};

type FormState = {
  title: string;
  notes: string;
  status: string;
  start: string; // datetime-local
  end: string; // datetime-local
  patientId: string;
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

function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

function emptyForm(): FormState {
  const start = new Date();
  const end = new Date(Date.now() + 30 * 60 * 1000);
  return {
    title: "Appointment",
    notes: "",
    status: "scheduled",
    start: toDatetimeLocal(start),
    end: toDatetimeLocal(end),
    patientId: "",
    staffId: "",
    projectId: "",
    treatmentPlanItemId: "",
  };
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "scheduled", label: "scheduled" },
  { value: "done", label: "done" },
  { value: "canceled", label: "canceled" },
];

export default function Appointments() {
  const nav = useNavigate();
  const location = useLocation() as any;

  const [session, setSession] = useState<any>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [treatmentItems, setTreatmentItems] = useState<TreatmentPlanItem[]>([]);

  // Consult note dialog
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [range, setRange] = useState(() => defaultRange());
  const [filters, setFilters] = useState({
    patientId: "",
    staffId: "",
    projectId: "",
    status: "",
  });

  const [items, setItems] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(() => emptyForm());

  // One-shot guards for navigation state
  const handledAppointmentIdRef = useRef<string | null>(null);
  const handledFromPlanRef = useRef<string | null>(null);

  const closeModal = () => setModalOpen(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const startISO = new Date(range.start).toISOString();
      const endISO = new Date(range.end).toISOString();

      const list: Appointment[] = await window.api.appointments.range(startISO, endISO, {
        patientId: filters.patientId || undefined,
        staffId: filters.staffId || undefined,
        projectId: filters.projectId || undefined,
        status: filters.status || undefined,
      });

      setItems(list || []);
      if (selectedId && !(list || []).some((x: Appointment) => x.id === selectedId)) setSelectedId("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setMode("create");
    const f = emptyForm();

    // Prefill from filters
    f.patientId = filters.patientId;
    f.staffId = filters.staffId;
    f.projectId = filters.projectId;
    f.status = filters.status;

    // Override from TreatmentPlan navigation
    if (location.state?.patientId) f.patientId = location.state.patientId;
    if (location.state?.fromTreatmentPlanItemId) f.treatmentPlanItemId = location.state.fromTreatmentPlanItemId;

    setForm(f);
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
      patientId: selected.patientId,
      staffId: selected.staffId ?? "",
      projectId: selected.projectId ?? "",
      treatmentPlanItemId: selected.treatmentPlanItemId ?? "",
    });
    setModalOpen(true);
  };

  const openEditById = (id: string) => {
    const a = items.find((x) => x.id === id);
    if (!a) return;

    setSelectedId(a.id);
    setMode("edit");
    setForm({
      title: a.title ?? "",
      notes: a.notes ?? "",
      status: a.status ?? "scheduled",
      start: toDatetimeLocal(new Date(a.start)),
      end: toDatetimeLocal(new Date(a.end)),
      patientId: a.patientId,
      staffId: a.staffId ?? "",
      projectId: a.projectId ?? "",
      treatmentPlanItemId: a.treatmentPlanItemId ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError(null);
    try {
      const title = form.title.trim();
      if (!title) return setError("Titel is verplicht.");
      if (!form.patientId) return setError("Patient is verplicht.");

      const start = new Date(form.start);
      const end = new Date(form.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError("Ongeldige start/eind datum.");
      if (end <= start) return setError("Eind moet na start liggen.");

      const payload: any = {
        title,
        notes: form.notes.trim() || null,
        status: form.status || null,
        start,
        end,
        patientId: form.patientId,
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
      setError(e?.message ?? "Save failed");
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
      setError(e?.message ?? "Delete failed");
    }
  };

  // Initial load (auth + dropdowns + appointments)
  useEffect(() => {
    (async () => {
      try {
        const me = await window.api.auth.me();
        if (!me) {
          nav("/login");
          return;
        }
        setSession(me);

        const p: Patient[] = await window.api.patients.list();
        const s: Staff[] = await window.api.staff.list();
        const pr: Project[] = await window.api.projects.list();

        setPatients(p || []);
        setStaff((s || []).filter((x) => x.active === true && ["DOCTOR", "ASSISTANT"].includes(String(x.role).toUpperCase())));
        setProjects(pr || []);

        await loadAll();
      } catch (e: any) {
        setError(e?.message ?? "Init load failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load treatment plan items when patient changes in form
  useEffect(() => {
    if (!form.patientId) {
      setTreatmentItems([]);
      return;
    }

    window.api.patientTreatmentPlan
      .listByPatient(form.patientId)
      .then((list: TreatmentPlanItem[]) => setTreatmentItems((list || []).filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS")) )
      .catch(() => setTreatmentItems([]));
  }, [form.patientId]);

  // Handle navigation: create from plan (one-shot)
  useEffect(() => {
    const planId = location.state?.fromTreatmentPlanItemId as string | undefined;
    if (!planId) return;
    if (handledFromPlanRef.current === planId) return;
    handledFromPlanRef.current = planId;

    openCreate();
    nav("/appointments", { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle navigation: open appointment edit by id (one-shot; waits for items)
  useEffect(() => {
    const id = location.state?.appointmentId as string | undefined;
    if (!id) return;
    if (items.length === 0) return;

    if (handledAppointmentIdRef.current === id) return;
    handledAppointmentIdRef.current = id;

    openEditById(id);
    nav("/appointments", { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const selectedLabel = selected
    ? `${selected.title} (${new Date(selected.start).toLocaleString()} → ${new Date(selected.end).toLocaleString()})`
    : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Appointments</Typography>
          <Typography variant="body2" color="text.secondary">Logged in as: {session?.username ?? "-"} ({session?.role ?? "-"})</Typography>
        </Box>
        <Button variant="outlined" onClick={loadAll}>Vernieuwen</Button>
      </Box>

      {/* Range + Filters */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Range + filters</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", md: "flex-end" }, flexWrap: "wrap" }}>
          <TextField
            label="Start"
            type="datetime-local"
            value={range.start}
            onChange={(e) => setRange((s) => ({ ...s, start: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
            sx={{ minWidth: { xs: "100%", md: 240 } }}
          />
          <TextField
            label="End"
            type="datetime-local"
            value={range.end}
            onChange={(e) => setRange((s) => ({ ...s, end: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
            sx={{ minWidth: { xs: "100%", md: 240 } }}
          />

          <TextField
            label="Patient"
            select
            size="small"
            value={filters.patientId}
            onChange={(e) => setFilters((s) => ({ ...s, patientId: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
            slotProps={{ select: { MenuProps: { disablePortal: true } } }}
          >
            <MenuItem value="">All patients</MenuItem>
            {patients.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.lastName}, {p.firstName}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Medewerker"
            select
            size="small"
            value={filters.staffId}
            onChange={(e) => setFilters((s) => ({ ...s, staffId: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
            slotProps={{ select: { MenuProps: { disablePortal: true } } }}
          >
            <MenuItem value="">All staff</MenuItem>
            {staff.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.lastName}, {d.firstName}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Project"
            select
            size="small"
            value={filters.projectId}
            onChange={(e) => setFilters((s) => ({ ...s, projectId: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 240 } }}
            slotProps={{ select: { MenuProps: { disablePortal: true } } }}
          >
            <MenuItem value="">All projects</MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Status"
            select
            size="small"
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 200 } }}
            slotProps={{ select: { MenuProps: { disablePortal: true } } }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={loadAll}>Apply + Load</Button>
          <Button
            variant="outlined"
            onClick={() => {
              setFilters({ patientId: "", staffId: "", projectId: "", status: "" });
              setRange(defaultRange());
              setSelectedId("");
              setTimeout(() => loadAll(), 0);
            }}
          >
            Reset
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { md: "auto" } }}>
            {loading && <CircularProgress size={18} />}
            <Typography variant="body2" color="text.secondary">{loading ? "Laden…" : `${items.length} appointments`}</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Toolbar */}
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

      {/* List */}
      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 600 }}>Lijst</Typography>
        </Box>
        <Divider />

        {items.map((a) => {
          const isSelected = a.id === selectedId;
          const patientName = a.patient ? `${a.patient.lastName}, ${a.patient.firstName}` : "(patient)";
          const staffName = a.staff ? `${a.staff.lastName}, ${a.staff.firstName}` : "(no staff)";
          const projectName = a.project ? a.project.name : "(no project)";

          return (
            <Box
              key={a.id}
              onClick={() => setSelectedId(a.id)}
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
                    {a.title} {a.status && <Chip label={a.status} size="small" sx={{ ml: 1 }} />}
                    {a.treatmentPlanItemId ? <Chip label="📌 Behandelplan" size="small" color="info" sx={{ ml: 1 }} /> : null}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{patientName} · {staffName} · {projectName}</Typography>
                  <Typography variant="body2" color="text.secondary">{new Date(a.start).toLocaleString()} → {new Date(a.end).toLocaleString()}</Typography>
                </Box>
                {isSelected && <Chip label="✓" size="small" color="primary" />}
              </Box>
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">Geen appointments gevonden in deze range.</Typography>
          </Box>
        )}
      </Paper>

      {/* Appointment Modal */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe afspraak" : "Afspraak bewerken"}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Titel" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} fullWidth />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Patient"
                select
                value={form.patientId}
                onChange={(e) => setForm((s) => ({ ...s, patientId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">Select patient…</MenuItem>
                {patients.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.lastName}, {p.firstName}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Docter / Assistent"
                select
                value={form.staffId}
                onChange={(e) => setForm((s) => ({ ...s, staffId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">(none)</MenuItem>
                {staff.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.lastName}, {d.firstName}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Project (optional)"
                select
                value={form.projectId}
                onChange={(e) => setForm((s) => ({ ...s, projectId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">(none)</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Behandelplan item (optioneel)"
                select
                value={form.treatmentPlanItemId}
                onChange={(e) => setForm((s) => ({ ...s, treatmentPlanItemId: e.target.value }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="">— Geen koppeling —</MenuItem>
                {treatmentItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.title} ({item.status})</MenuItem>
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
                {STATUS_OPTIONS.filter((x) => x.value !== "").map((opt) => (
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
                label="End"
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
          </Stack>
          {mode === "edit" && selected?.id ? (
              <AppointmentNotesPanel appointmentId={selected.id} />
            ) : null}
        </DialogContent>

        <DialogActions>
          {mode === "edit" && (
            <Button
              variant="outlined"
              onClick={() => {
                setNoteText("");
                setNoteOpen(true);
              }}
            >
              Voeg notitie toe
            </Button>
          )}
          <Button onClick={closeModal} variant="outlined">Annuleren</Button>
          <Button onClick={save} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>

      {/* Consult Note Dialog */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Nieuwe consultnotitie</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Notitie"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            multiline
            minRows={6}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setNoteOpen(false)}>Annuleren</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const pid = form.patientId;
              if (!pid) return;
              if (!noteText.trim()) return;
              await window.api.patientNotes.create({
                appointmentId: selected?.id ?? null,
                patientId: pid,
                type: "CONSULT",
                content: noteText,
                performedAt: new Date().toISOString(),
              });
              setNoteOpen(false);
            }}
          >
            Opslaan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
