import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// FullCalendar CSS


// MUI
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// Optional: if you don't have global typing yet, this prevents TS errors
declare global {
  interface Window {
    api: any;
  }
}

type Doctor = { id: string; firstName: string; lastName: string; active: boolean };
type Patient = { id: string; firstName: string; lastName: string };
type Project = { id: string; name: string };

type Appointment = {
  id: string;
  title: string;
  notes?: string | null;
  start: string;
  end: string;
  status?: string | null;
  patientId: string;
  doctorId?: string | null;
  projectId?: string | null;
  patient?: Patient;
  doctor?: Doctor | null;
  project?: Project | null;
};

type EditModel = {
  id?: string; // undefined = new
  title: string;
  notes: string;
  status: string;
  startISO: string;
  endISO: string;
  patientId: string;
  doctorId: string;
  projectId: string;
};



const STATUS_OPTIONS = [
  { value: "scheduled", label: "scheduled" },
  { value: "done", label: "done" },
  { value: "canceled", label: "canceled" },
];

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function localInputToISO(local: string) {
  return new Date(local).toISOString();
}


export default function Calendar() {
  const nav = useNavigate();
  const calendarRef = useRef<FullCalendar | null>(null);

  //const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [filters, setFilters] = useState({
    patientId: "",
    doctorId: "",
    projectId: "",
    status: ""
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [model, setModel] = useState<EditModel>({
    title: "Appointment",
    notes: "",
    status: "scheduled",
    startISO: new Date().toISOString(),
    endISO: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    patientId: "",
    doctorId: "",
    projectId: "",
  });

  const isEdit = useMemo(() => !!model.id, [model.id]);

  const refetch = () => {
    // Official approach: ref -> getApi() -> refetchEvents()
    calendarRef.current?.getApi().refetchEvents();
  };

  useEffect(() => {
    (async () => {
      const me = await window.api.auth.me();
      if (!me) {
        nav("/login");
        return;
      }
     

      // preload dropdown data
      const d: Doctor[] = await window.api.doctors.list("");
      const p: Patient[] = await window.api.patients.list("");
      const pr: Project[] = await window.api.projects.list("");

      setDoctors((d || []).filter((x) => x.active));
      setPatients(p || []);
      setProjects(pr || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   // FullCalendar events as a function
  const fetchEvents = async (fetchInfo: any, successCallback: any, failureCallback: any) => {
    try {
      setError(null);

      const list: Appointment[] = await window.api.appointments.range(
        fetchInfo.start.toISOString(),
        fetchInfo.end.toISOString(),
        {
          patientId: filters.patientId || undefined,
          doctorId: filters.doctorId || undefined,
          projectId: filters.projectId || undefined,
          status: filters.status || undefined,
        }
      );

      const events = (list || []).map((a) => ({
        id: a.id,
        title: formatTitle(a),
        start: a.start,
        end: a.end,
        extendedProps: { raw: a },
      }));

      successCallback(events);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load calendar events");
      failureCallback(e);
    }
  };

  const formatTitle = (a: Appointment) => {
    const p = a.patient ? `${a.patient.lastName}, ${a.patient.firstName}` : "Patient";
    const d = a.doctor ? `Dr. ${a.doctor.lastName}` : "";
    const pr = a.project ? a.project.name : "";
    const parts = [p, a.title, d, pr].filter(Boolean);
    return parts.join(" • ");
  };

  // Select callback: triggered when user selects time range [3](https://nodejs.org/en/about/previous-releases)
  const onSelect = (selectionInfo: any) => {
    setError(null);

    setModel({
      id: undefined,
      title: "Appointment",
      notes: "",
      status: "scheduled",
      startISO: selectionInfo.start.toISOString(),
      endISO: selectionInfo.end.toISOString(),
      patientId: filters.patientId || "",
      doctorId: filters.doctorId || "",
      projectId: filters.projectId || "",
    });

    setModalOpen(true);
  };

  const onEventClick = (clickInfo: any) => {
    const raw: Appointment | undefined = clickInfo.event?.extendedProps?.raw;
    if (!raw) return;

    setModel({
      id: raw.id,
      title: raw.title,
      notes: raw.notes ?? "",
      status: raw.status ?? "scheduled",
      startISO: new Date(raw.start).toISOString(),
      endISO: new Date(raw.end).toISOString(),
      patientId: raw.patientId,
      doctorId: raw.doctorId ?? "",
      projectId: raw.projectId ?? "",
    });

    setModalOpen(true);
  };

   const onEventDrop = async (info: any) => {
    try {
      const id = info.event.id as string;
      const start = info.event.start;
      const end = info.event.end;
      if (!start || !end) return;

      await window.api.appointments.update(id, { start, end });
      refetch();
    } catch (_e) {
      info.revert?.();
    }
  };

  const onEventResize = async (info: any) => {
    try {
      const id = info.event.id as string;
      const start = info.event.start;
      const end = info.event.end;
      if (!start || !end) return;

      await window.api.appointments.update(id, { start, end });
      refetch();
    } catch (_e) {
      info.revert?.();
    }
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);

    try {
      if (!model.title.trim()) return setError("Titel is verplicht.");
      if (!model.patientId) return setError("Patient is verplicht.");

      const start = new Date(model.startISO);
      const end = new Date(model.endISO);
      if (end <= start) return setError("Eind moet na start liggen.");

      const payload: any = {
        title: model.title.trim(),
        notes: model.notes.trim() || null,
        status: model.status || null,
        start,
        end,
        patientId: model.patientId,
        doctorId: model.doctorId || null,
        projectId: model.projectId || null,
      };

      if (isEdit && model.id) {
        await window.api.appointments.update(model.id, payload);
      } else {
        await window.api.appointments.create(payload);
      }

      closeModal();
      refetch();
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!model.id) return;
    if (!confirm("Delete this appointment?")) return;

    setError(null);
    try {
      await window.api.appointments.remove(model.id);
      closeModal();
      refetch();
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  };

  const selectedChip =
    (filters.patientId && patients.find((p) => p.id === filters.patientId)?.lastName) ||
    (filters.doctorId && doctors.find((d) => d.id === filters.doctorId)?.lastName) ||
    (filters.projectId && projects.find((p) => p.id === filters.projectId)?.name) ||
    "";

  //const applyFilters = () => {
   // refetch();
  //};

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Selecteer een tijdvak om een afspraak te maken.
          </Typography>
        </Box>

        {selectedChip ? <Chip label={`Filter: ${selectedChip}`} size="small" /> : null}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Filters</Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", md: "flex-end" }, flexWrap: "wrap" }}
        >
          <TextField
            label="Patient"
            select
            size="small"
            value={filters.patientId}
            onChange={(e) => setFilters((s) => ({ ...s, patientId: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 240 } }}
          >
            <MenuItem value="">All patients</MenuItem>
            {patients.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Doctor"
            select
            size="small"
            value={filters.doctorId}
            onChange={(e) => setFilters((s) => ({ ...s, doctorId: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 240 } }}
          >
            <MenuItem value="">All doctors</MenuItem>
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.lastName}, {d.firstName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Project"
            select
            size="small"
            value={filters.projectId}
            onChange={(e) => setFilters((s) => ({ ...s, projectId: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 260 } }}
          >
            <MenuItem value="">All projects</MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Status"
            select
            size="small"
            value={filters.status}
            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 200 } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={refetch}>
            Apply
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setFilters({ patientId: "", doctorId: "", projectId: "", status: "" });
              setTimeout(() => refetch(), 0);
            }}
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="auto"
          selectable={true}
          selectMirror={true}
          select={onSelect}
          eventClick={onEventClick}
          events={fetchEvents}
          editable={true}
          eventDrop={onEventDrop}
          eventResize={onEventResize}
        />
      </Paper>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{isEdit ? "Afspraak bewerken" : "Nieuwe afspraak"}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Titel"
              value={model.title}
              onChange={(e) => setModel((s) => ({ ...s, title: e.target.value }))}
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Patient"
                select
                value={model.patientId}
                onChange={(e) => setModel((s) => ({ ...s, patientId: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">Select patient…</MenuItem>
                {patients.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.lastName}, {p.firstName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Doctor (optional)"
                select
                value={model.doctorId}
                onChange={(e) => setModel((s) => ({ ...s, doctorId: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">(none)</MenuItem>
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.lastName}, {d.firstName}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Project (optional)"
                select
                value={model.projectId}
                onChange={(e) => setModel((s) => ({ ...s, projectId: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">(none)</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Status"
                select
                value={model.status}
                onChange={(e) => setModel((s) => ({ ...s, status: e.target.value }))}
                fullWidth
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Start"
                type="datetime-local"
                value={toLocalDatetimeInput(model.startISO)}
                onChange={(e) => setModel((s) => ({ ...s, startISO: localInputToISO(e.target.value) }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="End"
                type="datetime-local"
                value={toLocalDatetimeInput(model.endISO)}
                onChange={(e) => setModel((s) => ({ ...s, endISO: localInputToISO(e.target.value) }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>

            <TextField
              label="Notities (optioneel)"
              value={model.notes}
              onChange={(e) => setModel((s) => ({ ...s, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          {isEdit && (
            <Button onClick={remove} variant="contained" color="error">
              Verwijderen
            </Button>
          )}
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
