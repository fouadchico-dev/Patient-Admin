import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import InfoOutlined from "@mui/icons-material/InfoOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import StickyNote2Outlined from "@mui/icons-material/StickyNote2Outlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";

declare global {
  interface Window {
    api: any;
  }
}

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

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

type Appointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  status?: string | null;
  patientId: string;
};

type Note = {
  id: string;
  title: string;
  content?: string | null;
  notedAt: string;
  patientId: string;
  appointmentId?: string | null;
};

type PlanItem = {
  id: string;
  title: string;
  status: string;
};

type PatientFile = {
  id: string;
  originalName: string;
  uploadedAt: string;
};

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateTime(v?: string | null) {
  const d = safeDate(v);
  return d ? d.toLocaleString() : "-";
}

function fmtDate(v?: string | null) {
  const d = safeDate(v);
  return d ? d.toLocaleDateString() : "-";
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function genderLabel(g?: string | null) {
  switch (g) {
    case "MALE":
      return "Man";
    case "FEMALE":
      return "Vrouw";
    case "OTHER":
      return "Overig";
    default:
      return "Onbekend";
  }
}

export default function PatientGeneralTab(props: {
  patient: Patient;
  age?: number | null;
  isMinor?: boolean;
  onEdit?: () => void;
  onGoAppointments?: () => void;
  onGoNotes?: () => void;
  onGoFiles?: () => void;
  onGoPlan?: () => void;
}) {
  const { patient, age, isMinor, onEdit, onGoAppointments, onGoNotes, onGoFiles, onGoPlan } = props;

  const [loading, setLoading] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [lastAppt, setLastAppt] = useState<Appointment | null>(null);
  const [latestNote, setLatestNote] = useState<Note | null>(null);
  const [openPlanCount, setOpenPlanCount] = useState<number | null>(null);
  const [filesCount, setFilesCount] = useState<number | null>(null);
  const [lastFile, setLastFile] = useState<PatientFile | null>(null);

  const importantFlags = useMemo(() => {
    const flags: { label: string; color: "default" | "warning" | "error" | "info" }[] = [];
    if (isMinor) flags.push({ label: "Minderjarig", color: "warning" });
    if (patient.allergies && patient.allergies.trim()) flags.push({ label: "Allergieën", color: "error" });
    if (patient.notes && patient.notes.trim()) flags.push({ label: "Opmerking", color: "info" });
    return flags;
  }, [isMinor, patient.allergies, patient.notes]);

  const loadSummary = async () => {
    setLoading(true);
    setWarn(null);
    try {
      const pid = patient.id;

      // --- Appointments summary (uses existing appointments.range) ---
      if (window.api.appointments?.range) {
        const now = new Date();
        const startISO = new Date(now.getFullYear() - 2, 0, 1).toISOString();
        const endISO = new Date(now.getFullYear() + 2, 11, 31).toISOString();
        const list: Appointment[] = await window.api.appointments.range(startISO, endISO, { patientId: pid });
        const sorted = (list || []).slice().sort((a, b) => +new Date(a.start) - +new Date(b.start));
        const future = sorted.filter((a) => new Date(a.start) >= now);
        const past = sorted.filter((a) => new Date(a.start) < now);
        setNextAppt(future.length ? future[0] : null);
        setLastAppt(past.length ? past[past.length - 1] : null);
      } else {
        setWarn((w) => w ?? "appointments endpoints ontbreken.");
      }

      // --- Notes summary ---
      if (window.api.patientNotes?.listByPatient) {
        const notes: Note[] = await window.api.patientNotes.listByPatient(pid);
        setLatestNote((notes || [])[0] ?? null);
      } else {
        setWarn((w) => w ?? "patientNotes endpoints ontbreken.");
      }

      // --- Plan summary (open/in progress count) ---
      if (window.api.patientTreatmentPlan?.listByPatient) {
        const items: PlanItem[] = await window.api.patientTreatmentPlan.listByPatient(pid);
        const open = (items || []).filter((i: any) => i.status === "OPEN" || i.status === "IN_PROGRESS");
        setOpenPlanCount(open.length);
      } else {
        // not required
        setOpenPlanCount(null);
      }

      // --- Files summary ---
      if (window.api.patientFiles?.listByPatient) {
        const files: PatientFile[] = await window.api.patientFiles.listByPatient(pid);
        const sortedFiles = (files || []).slice().sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
        setFilesCount((files || []).length);
        setLastFile(sortedFiles[0] ?? null);
      } else {
        setFilesCount(null);
        setLastFile(null);
      }
    } catch (e: any) {
      setWarn(e?.message ?? "Kon samenvatting niet laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const Card = (p: { title: string; icon: any; action?: any; children: any }) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        {p.icon}
        <Typography sx={{ fontWeight: 800 }}>{p.title}</Typography>
        <Box sx={{ ml: "auto" }}>{p.action}</Box>
      </Box>
      {p.children}
    </Paper>
  );

  return (
    <Stack spacing={2}>
      {/* Top strip: flags + refresh */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip size="small" label={`Geboortedatum: ${fmtDate(patient.birthDate ?? null)}`} variant="outlined" />
          <Chip size="small" label={`Geslacht: ${genderLabel(patient.gender ?? "UNKNOWN")}`} variant="outlined" />
          {age !== null && age !== undefined ? (
            <Chip size="small" label={`Leeftijd: ${age}`} color={isMinor ? "warning" : "default"} />
          ) : null}

          {importantFlags.map((f) => (
            <Chip key={f.label} size="small" label={f.label} color={f.color} />
          ))}

          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            {loading ? <CircularProgress size={18} /> : null}
            <Button size="small" variant="outlined" onClick={loadSummary} disabled={loading}>
              Vernieuwen
            </Button>
          </Box>
        </Box>
      </Paper>

      {warn ? <Alert severity="warning">{warn}</Alert> : null}

      {/* Premium grid layout using CSS grid (no MUI Grid typing issues) */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <Card
          title="Persoonsgegevens"
          icon={<InfoOutlined fontSize="small" />}
          action={
            <Button variant="outlined" size="small" startIcon={<EditOutlined />} onClick={onEdit}>
              Bewerken
            </Button>
          }
        >
          <Typography><b>Naam:</b> {patient.firstName} {patient.lastName}</Typography>
          <Typography><b>Adres:</b> {patient.address ?? "-"}</Typography>
          <Typography><b>Stad:</b> {patient.city ?? "-"}</Typography>
          <Typography><b>Land:</b> {patient.country ?? "-"}</Typography>
        </Card>

        <Card
          title="Samenvatting"
          icon={<AssignmentOutlined fontSize="small" />}
          action={
            <Button variant="outlined" size="small" startIcon={<AddOutlined />} onClick={onGoPlan}>
              Zorgplan
            </Button>
          }
        >
          <Typography><b>Open zorgplan items:</b> {openPlanCount ?? "-"}</Typography>
          <Divider sx={{ my: 1.25 }} />
          <Typography variant="body2" color="text.secondary">
            Tip: open het zorgplan om taken te plannen en af te ronden.
          </Typography>
        </Card>

        <Card
          title="Afspraken"
          icon={<EventOutlined fontSize="small" />}
          action={
            <Button variant="outlined" size="small" startIcon={<EventOutlined />} onClick={onGoAppointments}>
              Ga naar afspraken
            </Button>
          }
        >
          <Typography><b>Volgende afspraak:</b> {nextAppt ? `${nextAppt.title} · ${fmtDateTime(nextAppt.start)}` : "-"}</Typography>
          <Typography><b>Laatste afspraak:</b> {lastAppt ? `${lastAppt.title} · ${fmtDateTime(lastAppt.start)}` : "-"}</Typography>
        </Card>

        <Card
          title="Laatste notitie"
          icon={<StickyNote2Outlined fontSize="small" />}
          action={
            <Button variant="outlined" size="small" startIcon={<StickyNote2Outlined />} onClick={onGoNotes}>
              Ga naar notities
            </Button>
          }
        >
          {latestNote ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" label={titleCase(latestNote.title)} variant="outlined" />
                {latestNote.appointmentId ? <Chip size="small" label="Afspraak" variant="outlined" /> : null}
                <Typography variant="body2" color="text.secondary">
                  {fmtDateTime(latestNote.notedAt)}
                </Typography>
              </Box>
              <Typography sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                {(latestNote.content ?? "").trim() || "-"}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">Nog geen notities.</Typography>
          )}
        </Card>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            gridColumn: { xs: "auto", md: "1 / span 2" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <WarningAmberOutlined fontSize="small" />
            <Typography sx={{ fontWeight: 800 }}>Belangrijk</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">Allergieën</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{patient.allergies ?? "-"}</Typography>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="body2" color="text.secondary">Algemene notities</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{patient.notes ?? "-"}</Typography>
        </Paper>

        <Card
          title="Bestanden"
          icon={<AttachFileOutlined fontSize="small" />}
          action={
            <Button variant="outlined" size="small" startIcon={<AttachFileOutlined />} onClick={onGoFiles}>
              Ga naar bestanden
            </Button>
          }
        >
          <Typography><b>Aantal bestanden:</b> {filesCount ?? "-"}</Typography>
          <Typography><b>Laatste upload:</b> {lastFile ? `${lastFile.originalName} · ${fmtDateTime(lastFile.uploadedAt)}` : "-"}</Typography>
        </Card>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Snelle acties</Typography>
          <Stack spacing={1}>
            <Button variant="contained" onClick={onGoAppointments} startIcon={<EventOutlined />}>
              Nieuwe afspraak
            </Button>
            <Button variant="outlined" onClick={onGoNotes} startIcon={<StickyNote2Outlined />}>
              Nieuwe notitie
            </Button>
            <Button variant="outlined" onClick={onGoFiles} startIcon={<AttachFileOutlined />}>
              Upload bestand
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Tip: deze knoppen brengen je naar de juiste tab of pagina.
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}
