import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
//import {alpha} from "@mui/material/styles"
//import { List, ListItemButton, ListItemText } from "@mui/material";

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
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import MaleOutlined from "@mui/icons-material/MaleOutlined";
import FemaleOutlined from "@mui/icons-material/FemaleOutlined";
import WcOutlined from "@mui/icons-material/WcOutlined";

import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ContactsOutlined from "@mui/icons-material/ContactsOutlined";
import LocalHospitalOutlined from "@mui/icons-material/LocalHospitalOutlined";
import MedicationOutlined from "@mui/icons-material/MedicationOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import StickyNote2Outlined from "@mui/icons-material/StickyNote2Outlined";
import EditOutlined from "@mui/icons-material/EditOutlined";

import PatientFilesTab from "./PatientFilesTab";
import PatientTreatmentPlanTab from "./PatientTreatmentPlanTab";
import PatientAppointmentsTab from "./PatientAppointmentsTab";
import PatientNotesTab from "./PatientNotesTab";
import PatientGeneralTab from "./PatientGeneralTab";

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

type PatientDiagnosis = {
  id: string;
  patientId: string;
  name: string;
  code?: string | null;
  notes?: string | null;
  diagnosedAt: string;
};

type PatientMedication = {
  id: string;
  patientId: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type ContactType = "GUARDIAN" | "EMERGENCY";

type PatientContact = {
  id: string;
  patientId: string;
  type: ContactType;
  name: string;
  relation?: string | null;
  phone: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type PatientFile = {
  id: string;
  patientId: string;
  originalName: string;
  storedName: string;
  storedPath: string;
  mimeType: string;
  size: number;
  caption?: string | null;
  uploadedAt: string;
};

function TabPanel(props: { value: number; index: number; children: any }) {
  const { value, index, children } = props;
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function toDateInput(v?: string | null) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function ageFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function genderMeta(g?: string | null) {
  switch (g) {
    case "MALE":
      return { label: "Man", icon: <MaleOutlined fontSize="small" />, chipColor: "info" as const };
    case "FEMALE":
      return { label: "Vrouw", icon: <FemaleOutlined fontSize="small" />, chipColor: "secondary" as const };
    case "OTHER":
      return { label: "Overig", icon: <WcOutlined fontSize="small" />, chipColor: "default" as const };
    default:
      return { label: "Onbekend", icon: <WcOutlined fontSize="small" />, chipColor: "default" as const };
  }
}


export default function PatientDetailPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [patient, setPatient] = useState<Patient | null>(null);

  // -------------------- CONTACTS --------------------
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [contactSelectedId, setContactSelectedId] = useState<string>("");
  const contactSelected = useMemo(
    () => contacts.find((c) => c.id === contactSelectedId) ?? null,
    [contacts, contactSelectedId]
  );

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactMode, setContactMode] = useState<"create" | "edit">("create");
  const [contactForm, setContactForm] = useState({
    type: "EMERGENCY" as ContactType,
    name: "",
    relation: "",
    phone: "",
    email: "",
    notes: "",
  });

  // -------------------- DIAGNOSES --------------------
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagnoses, setDiagnoses] = useState<PatientDiagnosis[]>([]);
  const [diagModalOpen, setDiagModalOpen] = useState(false);
  const [diagMode, setDiagMode] = useState<"create" | "edit">("create");
  const [diagSelectedId, setDiagSelectedId] = useState<string>("");
  const diagSelected = useMemo(
    () => diagnoses.find((d) => d.id === diagSelectedId) ?? null,
    [diagnoses, diagSelectedId]
  );
  const [diagForm, setDiagForm] = useState({ name: "", code: "", notes: "", diagnosedAt: "" });

  // -------------------- MEDICATIONS --------------------
  const [medLoading, setMedLoading] = useState(false);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [medMode, setMedMode] = useState<"create" | "edit">("create");
  const [medSelectedId, setMedSelectedId] = useState<string>("");
  const medSelected = useMemo(
    () => medications.find((m) => m.id === medSelectedId) ?? null,
    [medications, medSelectedId]
  );
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "", notes: "", startDate: "", endDate: "" });

  // -------------------- FILES --------------------
  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [fileSelectedId, setFileSelectedId] = useState<string>("");
  const fileSelected = useMemo(() => files.find((f) => f.id === fileSelectedId) ?? null, [files, fileSelectedId]);

  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const [captionValue, setCaptionValue] = useState("");

  // -------------------- PATIENT EDIT (read-only + button) --------------------
  const [patientEditOpen, setPatientEditOpen] = useState(false);
  const [patientEditForm, setPatientEditForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "UNKNOWN" as Gender,
    address: "",
    city: "",
    country: "",
    allergies: "",
    notes: "",
  });

  const titleText = useMemo(() => {
    if (!patient) return "Patient";
    return `${patient.lastName}, ${patient.firstName}`;
  }, [patient]);

  const age = useMemo(() => ageFromBirthDate(patient?.birthDate ?? null), [patient]);
  const isMinor = age !== null ? age < 18 : false;

  const counts = useMemo(
    () => ({
      contacts: contacts.length,
      diagnoses: diagnoses.length,
      meds: medications.length,
      files: files.length,
      // appointments/notes counts are unknown here without extra endpoints.
      // Keep undefined => no chip.
    }),
    [contacts.length, diagnoses.length, medications.length, files.length]
  );

  // -------------------- LOAD PATIENT --------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await window.api.auth.me();
        if (!me) {
          nav("/login", { replace: true });
          return;
        }
        if (!id) {
          setError("Geen patientId in route.");
          return;
        }

        if (window.api.patients.get) {
          const p: Patient = await window.api.patients.get(id);
          setPatient(p ?? null);
        } else {
          const list: Patient[] = await window.api.patients.list("");
          const p = (list || []).find((x) => x.id === id) ?? null;
          setPatient(p);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load patient");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // -------------------- LOADERS --------------------
  const loadContacts = async () => {
    if (!id) return;
    if (!window.api.patientContacts?.listByPatient) {
      setError("patientContacts endpoints ontbreken. Voeg Phase3A Contacts IPC/preload toe.");
      return;
    }
    setContactsLoading(true);
    try {
      const list: PatientContact[] = await window.api.patientContacts.listByPatient(id);
      setContacts(list || []);
      if (contactSelectedId && !(list || []).some((x: any) => x.id === contactSelectedId)) setContactSelectedId("");
    } finally {
      setContactsLoading(false);
    }
  };

  const loadDiagnoses = async () => {
    if (!id) return;
    if (!window.api.patientDiagnoses?.listByPatient) {
      setError("patientDiagnoses endpoints ontbreken. Voeg Phase2 Full Medical IPC/preload toe.");
      return;
    }
    setDiagLoading(true);
    try {
      const list: PatientDiagnosis[] = await window.api.patientDiagnoses.listByPatient(id);
      setDiagnoses(list || []);
      if (diagSelectedId && !(list || []).some((x: any) => x.id === diagSelectedId)) setDiagSelectedId("");
    } finally {
      setDiagLoading(false);
    }
  };

  const loadMedications = async () => {
    if (!id) return;
    if (!window.api.patientMedications?.listByPatient) {
      setError("patientMedications endpoints ontbreken. Voeg Phase2 Full Medical IPC/preload toe.");
      return;
    }
    setMedLoading(true);
    try {
      const list: PatientMedication[] = await window.api.patientMedications.listByPatient(id);
      setMedications(list || []);
      if (medSelectedId && !(list || []).some((x: any) => x.id === medSelectedId)) setMedSelectedId("");
    } finally {
      setMedLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!id) return;
    if (!window.api.patientFiles?.listByPatient) {
      setError("patientFiles endpoints ontbreken. Voeg Phase3B Files IPC/preload toe.");
      return;
    }
    setFilesLoading(true);
    try {
      const list: PatientFile[] = await window.api.patientFiles.listByPatient(id);
      setFiles(list || []);
      if (fileSelectedId && !(list || []).some((x: any) => x.id === fileSelectedId)) setFileSelectedId("");
    } finally {
      setFilesLoading(false);
    }
  };

  // Lazy-load per tab
  useEffect(() => {
    if (!patient) return;
    if (tab === 1 && contacts.length === 0 && !contactsLoading) loadContacts();
    if (tab === 2 && diagnoses.length === 0 && !diagLoading) loadDiagnoses();
    if (tab === 3 && medications.length === 0 && !medLoading) loadMedications();
    if (tab === 6 && files.length === 0 && !filesLoading) loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, patient]);

  // -------------------- CONTACTS CRUD --------------------
  const openContactCreate = (defaultType?: ContactType) => {
    setContactMode("create");
    setContactForm({
      type: defaultType ?? "EMERGENCY",
      name: "",
      relation: "",
      phone: "",
      email: "",
      notes: "",
    });
    setContactModalOpen(true);
  };

  const openContactEdit = () => {
    if (!contactSelected) return;
    setContactMode("edit");
    setContactForm({
      type: contactSelected.type,
      name: contactSelected.name ?? "",
      relation: contactSelected.relation ?? "",
      phone: contactSelected.phone ?? "",
      email: contactSelected.email ?? "",
      notes: contactSelected.notes ?? "",
    });
    setContactModalOpen(true);
  };

  const saveContact = async () => {
    if (!id) return;
    setError(null);
    try {
      if (!contactForm.name.trim()) return setError("Naam is verplicht");
      if (!contactForm.phone.trim()) return setError("Telefoon is verplicht");

      if (contactMode === "create") {
        await window.api.patientContacts.create({
          patientId: id,
          type: contactForm.type,
          name: contactForm.name,
          relation: contactForm.relation || null,
          phone: contactForm.phone,
          email: contactForm.email || null,
          notes: contactForm.notes || null,
        });
      } else {
        if (!contactSelected) return;
        await window.api.patientContacts.update(contactSelected.id, {
          type: contactForm.type,
          name: contactForm.name,
          relation: contactForm.relation || null,
          phone: contactForm.phone,
          email: contactForm.email || null,
          notes: contactForm.notes || null,
        });
      }

      setContactModalOpen(false);
      await loadContacts();
    } catch (e: any) {
      setError(e?.message ?? "Save contact failed");
    }
  };

  const removeContact = async () => {
    if (!contactSelected) return;
    if (!confirm(`Contact verwijderen: ${contactSelected.name}?`)) return;
    setError(null);
    try {
      await window.api.patientContacts.remove(contactSelected.id);
      setContactSelectedId("");
      await loadContacts();
    } catch (e: any) {
      setError(e?.message ?? "Remove contact failed");
    }
  };

  const guardians = useMemo(() => contacts.filter((c) => c.type === "GUARDIAN"), [contacts]);
  const emergencies = useMemo(() => contacts.filter((c) => c.type === "EMERGENCY"), [contacts]);

  // -------------------- DIAGNOSES CRUD --------------------
  const openDiagCreate = () => {
    setDiagMode("create");
    setDiagForm({ name: "", code: "", notes: "", diagnosedAt: "" });
    setDiagModalOpen(true);
  };

  const openDiagEdit = () => {
    if (!diagSelected) return;
    setDiagMode("edit");
    setDiagForm({
      name: diagSelected.name ?? "",
      code: diagSelected.code ?? "",
      notes: diagSelected.notes ?? "",
      diagnosedAt: toDateInput(diagSelected.diagnosedAt),
    });
    setDiagModalOpen(true);
  };

  const saveDiag = async () => {
    if (!id) return;
    if (!diagForm.name.trim()) {
      setError("Diagnosis name is required");
      return;
    }
    setError(null);
    if (diagMode === "create") {
      await window.api.patientDiagnoses.create({
        patientId: id,
        name: diagForm.name,
        code: diagForm.code || null,
        notes: diagForm.notes || null,
        diagnosedAt: diagForm.diagnosedAt ? new Date(diagForm.diagnosedAt) : null,
      });
    } else {
      if (!diagSelected) return;
      await window.api.patientDiagnoses.update(diagSelected.id, {
        name: diagForm.name,
        code: diagForm.code || null,
        notes: diagForm.notes || null,
        diagnosedAt: diagForm.diagnosedAt ? new Date(diagForm.diagnosedAt) : null,
      });
    }
    setDiagModalOpen(false);
    await loadDiagnoses();
  };

  const removeDiag = async () => {
    if (!diagSelected) return;
    if (!confirm(`Diagnosis verwijderen: ${diagSelected.name}?`)) return;
    await window.api.patientDiagnoses.remove(diagSelected.id);
    setDiagSelectedId("");
    await loadDiagnoses();
  };

  // -------------------- MEDICATIONS CRUD --------------------
  const openMedCreate = () => {
    setMedMode("create");
    setMedForm({ name: "", dosage: "", frequency: "", notes: "", startDate: "", endDate: "" });
    setMedModalOpen(true);
  };

  const openMedEdit = () => {
    if (!medSelected) return;
    setMedMode("edit");
    setMedForm({
      name: medSelected.name ?? "",
      dosage: medSelected.dosage ?? "",
      frequency: medSelected.frequency ?? "",
      notes: medSelected.notes ?? "",
      startDate: toDateInput(medSelected.startDate),
      endDate: toDateInput(medSelected.endDate),
    });
    setMedModalOpen(true);
  };

  const saveMed = async () => {
    if (!id) return;
    if (!medForm.name.trim()) {
      setError("Medication name is required");
      return;
    }
    setError(null);
    if (medMode === "create") {
      await window.api.patientMedications.create({
        patientId: id,
        name: medForm.name,
        dosage: medForm.dosage || null,
        frequency: medForm.frequency || null,
        notes: medForm.notes || null,
        startDate: medForm.startDate ? new Date(medForm.startDate) : null,
        endDate: medForm.endDate ? new Date(medForm.endDate) : null,
      });
    } else {
      if (!medSelected) return;
      await window.api.patientMedications.update(medSelected.id, {
        name: medForm.name,
        dosage: medForm.dosage || null,
        frequency: medForm.frequency || null,
        notes: medForm.notes || null,
        startDate: medForm.startDate ? new Date(medForm.startDate) : null,
        endDate: medForm.endDate ? new Date(medForm.endDate) : null,
      });
    }
    setMedModalOpen(false);
    await loadMedications();
  };

  const removeMed = async () => {
    if (!medSelected) return;
    if (!confirm(`Medicatie verwijderen: ${medSelected.name}?`)) return;
    await window.api.patientMedications.remove(medSelected.id);
    setMedSelectedId("");
    await loadMedications();
  };

  // -------------------- FILES CRUD (caption only shown here) --------------------
  const saveCaption = async () => {
    if (!fileSelected) return;
    setError(null);
    try {
      await window.api.patientFiles.update(fileSelected.id, { caption: captionValue || null });
      setCaptionModalOpen(false);
      await loadFiles();
    } catch (e: any) {
      setError(e?.message ?? "Caption update failed");
    }
  };

  // -------------------- PATIENT EDIT --------------------
  const openPatientEdit = () => {
    if (!patient) return;
    setPatientEditForm({
      firstName: patient.firstName ?? "",
      lastName: patient.lastName ?? "",
      birthDate: toDateInput(patient.birthDate),
      gender: (patient.gender ?? "UNKNOWN") as Gender,
      address: patient.address ?? "",
      city: patient.city ?? "",
      country: patient.country ?? "",
      allergies: patient.allergies ?? "",
      notes: patient.notes ?? "",
    });
    setPatientEditOpen(true);
  };

  const savePatientEdit = async () => {
    if (!id) return;
    setError(null);
    try {
      if (!patientEditForm.firstName.trim()) return setError("Voornaam is verplicht");
      if (!patientEditForm.lastName.trim()) return setError("Achternaam is verplicht");

      // assumes patients.update exists in preload
      if (!window.api.patients?.update) {
        setError("patients.update endpoint ontbreekt.");
        return;
      }

      await window.api.patients.update(id, {
        firstName: patientEditForm.firstName,
        lastName: patientEditForm.lastName,
        birthDate: patientEditForm.birthDate ? new Date(patientEditForm.birthDate) : null,
        gender: patientEditForm.gender || null,
        address: patientEditForm.address || null,
        city: patientEditForm.city || null,
        country: patientEditForm.country || null,
        allergies: patientEditForm.allergies || null,
        notes: patientEditForm.notes || null,
      });

      // reload patient
      const p: Patient = window.api.patients.get ? await window.api.patients.get(id) : (await window.api.patients.list("")).find((x: any) => x.id === id);
      setPatient(p ?? null);
      setPatientEditOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Patient opslaan mislukt");
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const headerSub = patient
    ? `Patientdossier  ${patient.birthDate ? ` · ${String(patient.birthDate).slice(0, 10)}` : ""}${age !== null ? ` · Leeftijd: ${age}` : ""}`
    : "Patientdossier";

  const tabs = [
    { label: "Algemeen", icon: <InfoOutlined fontSize="small" /> },
    { label: "Contacten", icon: <ContactsOutlined fontSize="small" />, count: counts.contacts },
    { label: "Diagnoses", icon: <LocalHospitalOutlined fontSize="small" />, count: counts.diagnoses },
    { label: "Medicatie", icon: <MedicationOutlined fontSize="small" />, count: counts.meds },
    { label: "Behandelplan", icon: <AssignmentOutlined fontSize="small" /> },
    { label: "Afspraken", icon: <EventOutlined fontSize="small" /> },
    { label: "Bestanden", icon: <AttachFileOutlined fontSize="small" />, count: counts.files },
    { label: "Notities", icon: <StickyNote2Outlined fontSize="small" /> },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Sticky header + tabs */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            {(() => {
  const g = genderMeta(patient?.gender ?? "UNKNOWN");
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {titleText}
      </Typography>

      <Chip
        icon={g.icon}
        label={g.label}
        size="small"
        color={g.chipColor}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      />
    </Box>
  );
})()}
            <Typography variant="body2" color="text.secondary">{headerSub}</Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => nav("/patients")}>Terug</Button>
            <Button variant="outlined" startIcon={<EditOutlined />} onClick={openPatientEdit} disabled={!patient}>Bewerken</Button>
            {age !== null ? <Chip label={`Leeftijd: ${age}`} size="small" color={isMinor ? "warning" : "default"} /> : null}
          </Stack>
        </Box>

        {error && <Alert severity="warning" sx={{ mt: 1 }}>{error}</Alert>}

        <Divider sx={{ my: 1.5 }} />

        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            "& .MuiTabs-indicator": { display: "none" },
          }}
        >
          {tabs.map((t, idx) => (
            <Tab
              key={t.label}
              value={idx}
              icon={t.icon}
              iconPosition="start"
              label={t.label}
              sx={{
                textTransform: "none",
                minHeight: 40,
                borderRadius: 2,
                mr: 1,
                px: 1.5,
                "&.Mui-selected": {
                  bgcolor: "primary.50",
                  color: "primary.main",
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Content */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
       <TabPanel value={tab} index={0}>
  {!patient ? (
    <Typography variant="body2" color="text.secondary">Patient niet gevonden.</Typography>
  ) : (
    <PatientGeneralTab
      patient={patient}
      age={age}
      isMinor={isMinor}
      onEdit={openPatientEdit}
      onGoPlan={() => setTab(4)}
      onGoAppointments={() => setTab(5)}
      onGoFiles={() => setTab(6)}
      onGoNotes={() => setTab(7)}
    />
  )}
</TabPanel>

        <TabPanel value={tab} index={1}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Contacten</Typography>
          {contactsLoading && <CircularProgress size={18} />}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
            <Button variant="contained" onClick={() => openContactCreate("EMERGENCY")}>Nieuw noodcontact</Button>
            <Button variant="contained" color="inherit" onClick={() => openContactCreate("GUARDIAN")} disabled={!isMinor}>
              Nieuw contactpersoon (minderjarig)
            </Button>
            <Button variant="outlined" onClick={openContactEdit} disabled={!contactSelected}>Bewerken</Button>
            <Button variant="outlined" color="error" onClick={removeContact} disabled={!contactSelected}>Verwijderen</Button>
            <Button variant="outlined" onClick={loadContacts} disabled={contactsLoading}>Vernieuwen</Button>
          </Box>

          {isMinor ? (
            <Alert severity="info">Patient is minderjarig. Voeg een contactpersoon/verzorger toe onder "Guardian".</Alert>
          ) : (
            <Alert severity="info">Patient is niet minderjarig. Guardian-knop is disabled.</Alert>
          )}

          <Typography sx={{ fontWeight: 600, mt: 2 }}>Guardian (contactpersoon)</Typography>
          <Paper variant="outlined" sx={{ mt: 1 }}>
            {guardians.map((c) => {
              const isSel = c.id === contactSelectedId;
              return (
                <Box
                  key={c.id}
                  onClick={() => setContactSelectedId(c.id)}
                  sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: isSel ? "action.selected" : "background.paper", borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{[c.relation, c.phone, c.email].filter(Boolean).join(" • ")}</Typography>
                  {c.notes ? <Typography variant="body2" color="text.secondary">{c.notes}</Typography> : null}
                </Box>
              );
            })}
            {!contactsLoading && guardians.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}><Typography variant="body2" color="text.secondary">Geen guardian contact.</Typography></Box>
            ) : null}
          </Paper>

          <Typography sx={{ fontWeight: 600, mt: 2 }}>Noodcontact</Typography>
          <Paper variant="outlined" sx={{ mt: 1 }}>
            {emergencies.map((c) => {
              const isSel = c.id === contactSelectedId;
              return (
                <Box
                  key={c.id}
                  onClick={() => setContactSelectedId(c.id)}
                  sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: isSel ? "action.selected" : "background.paper", borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{[c.relation, c.phone, c.email].filter(Boolean).join(" • ")}</Typography>
                  {c.notes ? <Typography variant="body2" color="text.secondary">{c.notes}</Typography> : null}
                </Box>
              );
            })}
            {!contactsLoading && emergencies.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}><Typography variant="body2" color="text.secondary">Geen noodcontact.</Typography></Box>
            ) : null}
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Diagnoses</Typography>
          {diagLoading && <CircularProgress size={18} />}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
            <Button variant="contained" onClick={openDiagCreate}>Nieuw</Button>
            <Button variant="outlined" onClick={openDiagEdit} disabled={!diagSelected}>Bewerken</Button>
            <Button variant="outlined" color="error" onClick={removeDiag} disabled={!diagSelected}>Verwijderen</Button>
            <Button variant="outlined" onClick={loadDiagnoses} disabled={diagLoading}>Vernieuwen</Button>
          </Box>
          <Paper variant="outlined">
            {diagnoses.map((d) => {
              const isSel = d.id === diagSelectedId;
              return (
                <Box
                  key={d.id}
                  onClick={() => setDiagSelectedId(d.id)}
                  sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: isSel ? "action.selected" : "background.paper", borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{d.name}{d.code ? <Chip label={d.code} size="small" sx={{ ml: 1 }} /> : null}</Typography>
                  {d.notes ? <Typography variant="body2" color="text.secondary">{d.notes}</Typography> : null}
                  <Typography variant="caption" color="text.secondary">{String(d.diagnosedAt).slice(0, 19).replace("T", " ")}</Typography>
                </Box>
              );
            })}
            {!diagLoading && diagnoses.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}><Typography variant="body2" color="text.secondary">Geen diagnoses.</Typography></Box>
            ) : null}
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Medicatie</Typography>
          {medLoading && <CircularProgress size={18} />}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
            <Button variant="contained" onClick={openMedCreate}>Nieuw</Button>
            <Button variant="outlined" onClick={openMedEdit} disabled={!medSelected}>Bewerken</Button>
            <Button variant="outlined" color="error" onClick={removeMed} disabled={!medSelected}>Verwijderen</Button>
            <Button variant="outlined" onClick={loadMedications} disabled={medLoading}>Vernieuwen</Button>
          </Box>
          <Paper variant="outlined">
            {medications.map((m) => {
              const isSel = m.id === medSelectedId;
              return (
                <Box
                  key={m.id}
                  onClick={() => setMedSelectedId(m.id)}
                  sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: isSel ? "action.selected" : "background.paper", borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{m.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{[m.dosage, m.frequency].filter(Boolean).join(" • ")}</Typography>
                  {m.notes ? <Typography variant="body2" color="text.secondary">{m.notes}</Typography> : null}
                  {(m.startDate || m.endDate) ? <Typography variant="caption" color="text.secondary">{toDateInput(m.startDate)} - {toDateInput(m.endDate) || ""}</Typography> : null}
                </Box>
              );
            })}
            {!medLoading && medications.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}><Typography variant="body2" color="text.secondary">Geen medicatie.</Typography></Box>
            ) : null}
          </Paper>x
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <PatientTreatmentPlanTab patientId={id!} />
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <PatientAppointmentsTab patientId={id!} />
        </TabPanel>

        <TabPanel value={tab} index={6}>
          <PatientFilesTab patientId={id!} />
        </TabPanel>

        <TabPanel value={tab} index={7}>
          <PatientNotesTab patientId={id!} />
        </TabPanel>
      </Paper>

      {/* Patient edit dialog */}
      <Dialog open={patientEditOpen} onClose={() => setPatientEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Patient bewerken</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Voornaam" value={patientEditForm.firstName} onChange={(e) => setPatientEditForm((s) => ({ ...s, firstName: e.target.value }))} fullWidth />
              <TextField label="Achternaam" value={patientEditForm.lastName} onChange={(e) => setPatientEditForm((s) => ({ ...s, lastName: e.target.value }))} fullWidth />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Geboortedatum"
                type="date"
                value={patientEditForm.birthDate}
                onChange={(e) => setPatientEditForm((s) => ({ ...s, birthDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Geslacht"
                select
                value={patientEditForm.gender}
                onChange={(e) => setPatientEditForm((s) => ({ ...s, gender: e.target.value as Gender }))}
                fullWidth
              >
                <MenuItem value="UNKNOWN">Unknown</MenuItem>
                <MenuItem value="MALE">MALE</MenuItem>
                <MenuItem value="FEMALE">FEMALE</MenuItem>
                <MenuItem value="OTHER">OTHER</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Adres" value={patientEditForm.address} onChange={(e) => setPatientEditForm((s) => ({ ...s, address: e.target.value }))} fullWidth />
              <TextField label="Stad" value={patientEditForm.city} onChange={(e) => setPatientEditForm((s) => ({ ...s, city: e.target.value }))} fullWidth />
            </Stack>

            <TextField label="Land" value={patientEditForm.country} onChange={(e) => setPatientEditForm((s) => ({ ...s, country: e.target.value }))} fullWidth />
            <TextField label="Allergieën" value={patientEditForm.allergies} onChange={(e) => setPatientEditForm((s) => ({ ...s, allergies: e.target.value }))} multiline minRows={2} fullWidth />
            <TextField label="Notities" value={patientEditForm.notes} onChange={(e) => setPatientEditForm((s) => ({ ...s, notes: e.target.value }))} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setPatientEditOpen(false)}>Annuleren</Button>
          <Button variant="contained" onClick={savePatientEdit}>Opslaan</Button>
        </DialogActions>
      </Dialog>

      {/* CONTACT modal */}
      <Dialog open={contactModalOpen} onClose={() => setContactModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{contactMode === "create" ? "Nieuw contact" : "Contact bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Type" select value={contactForm.type} onChange={(e) => setContactForm((s) => ({ ...s, type: e.target.value as ContactType }))} fullWidth>
              <MenuItem value="EMERGENCY">Noodcontact</MenuItem>
              <MenuItem value="GUARDIAN">Contactpersoon (guardian)</MenuItem>
            </TextField>
            <TextField label="Naam" value={contactForm.name} onChange={(e) => setContactForm((s) => ({ ...s, name: e.target.value }))} fullWidth />
            <TextField label="Relatie" value={contactForm.relation} onChange={(e) => setContactForm((s) => ({ ...s, relation: e.target.value }))} fullWidth />
            <TextField label="Telefoon" value={contactForm.phone} onChange={(e) => setContactForm((s) => ({ ...s, phone: e.target.value }))} fullWidth />
            <TextField label="Email" value={contactForm.email} onChange={(e) => setContactForm((s) => ({ ...s, email: e.target.value }))} fullWidth />
            <TextField label="Notities" value={contactForm.notes} onChange={(e) => setContactForm((s) => ({ ...s, notes: e.target.value }))} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactModalOpen(false)} variant="outlined">Annuleren</Button>
          <Button onClick={saveContact} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>

      {/* Diagnosis modal */}
      <Dialog open={diagModalOpen} onClose={() => setDiagModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{diagMode === "create" ? "Nieuwe diagnose" : "Diagnose bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Naam" value={diagForm.name} onChange={(e) => setDiagForm((s) => ({ ...s, name: e.target.value }))} fullWidth />
            <TextField label="Code" value={diagForm.code} onChange={(e) => setDiagForm((s) => ({ ...s, code: e.target.value }))} fullWidth />
            <TextField label="Diagnose datum" type="date" value={diagForm.diagnosedAt} onChange={(e) => setDiagForm((s) => ({ ...s, diagnosedAt: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField label="Notities" value={diagForm.notes} onChange={(e) => setDiagForm((s) => ({ ...s, notes: e.target.value }))} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiagModalOpen(false)} variant="outlined">Annuleren</Button>
          <Button onClick={saveDiag} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>

      {/* Medication modal */}
      <Dialog open={medModalOpen} onClose={() => setMedModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{medMode === "create" ? "Nieuwe medicatie" : "Medicatie bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Naam" value={medForm.name} onChange={(e) => setMedForm((s) => ({ ...s, name: e.target.value }))} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Dosering" value={medForm.dosage} onChange={(e) => setMedForm((s) => ({ ...s, dosage: e.target.value }))} fullWidth />
              <TextField label="Frequentie" value={medForm.frequency} onChange={(e) => setMedForm((s) => ({ ...s, frequency: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Start" type="date" value={medForm.startDate} onChange={(e) => setMedForm((s) => ({ ...s, startDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Einde" type="date" value={medForm.endDate} onChange={(e) => setMedForm((s) => ({ ...s, endDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            </Stack>
            <TextField label="Notities" value={medForm.notes} onChange={(e) => setMedForm((s) => ({ ...s, notes: e.target.value }))} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMedModalOpen(false)} variant="outlined">Annuleren</Button>
          <Button onClick={saveMed} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>

      {/* Caption modal */}
      <Dialog open={captionModalOpen} onClose={() => setCaptionModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Caption aanpassen</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Caption" value={captionValue} onChange={(e) => setCaptionValue(e.target.value)} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaptionModalOpen(false)} variant="outlined">Annuleren</Button>
          <Button onClick={saveCaption} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
