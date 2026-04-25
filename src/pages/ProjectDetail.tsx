import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

/*
type PatientDiagnosis = any;
type PatientMedication = any;
type PatientHistory = any;
*/

function TabPanel(props: { value: number; index: number; children: any }) {
  const { value, index, children } = props;
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
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

export default function ProjectDetailPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [patient, setPatient] = useState<Patient | null>(null);

  // Contacts
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [contactSelectedId, setContactSelectedId] = useState<string>("");
  const contactSelected = useMemo(() => contacts.find((c) => c.id === contactSelectedId) ?? null, [contacts, contactSelectedId]);

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

  const title = useMemo(() => {
    if (!patient) return "Patient";
    return `${patient.lastName}, ${patient.firstName}`;
  }, [patient]);

  const age = useMemo(() => ageFromBirthDate(patient?.birthDate ?? null), [patient]);
  const isMinor = age !== null ? age < 18 : false;

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

  const loadContacts = async () => {
    if (!id) return;
    if (!window.api.patientContacts?.listByPatient) {
      setError("patientContacts endpoints ontbreken. Voeg fase 3 contacts IPC/preload toe.");
      return;
    }
    setContactsLoading(true);
    try {
      const list: PatientContact[] = await window.api.patientContacts.listByPatient(id);
      setContacts(list || []);
      if (contactSelectedId && !(list || []).some((x) => x.id === contactSelectedId)) setContactSelectedId("");
    } finally {
      setContactsLoading(false);
    }
  };

  // Lazy-load contacts tab
  useEffect(() => {
    if (!patient) return;
    if (tab === 1 && contacts.length === 0 && !contactsLoading) loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, patient]);

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

      const payload = {
        patientId: id,
        type: contactForm.type,
        name: contactForm.name,
        relation: contactForm.relation || null,
        phone: contactForm.phone,
        email: contactForm.email || null,
        notes: contactForm.notes || null,
      };

      if (contactMode === "create") {
        await window.api.patientContacts.create(payload);
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

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">Patientdossier</Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => nav("/patients")}>Terug</Button>
          {patient?.gender ? <Chip label={patient.gender} size="small" /> : null}
          {patient?.birthDate ? <Chip label={String(patient.birthDate).slice(0, 10)} size="small" /> : null}
          {age !== null ? <Chip label={`Leeftijd: ${age}`} size="small" color={isMinor ? "warning" : "default"} /> : null}
        </Stack>
      </Box>

      {error && <Alert severity="warning">{error}</Alert>}

      <Paper variant="outlined">
        <Box sx={{ px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Algemeen" />
            <Tab label="Contacten" />
            <Tab label="Diagnoses" />
            <Tab label="Medicatie" />
            <Tab label="Geschiedenis" />
            <Tab label="Bestanden" />
          </Tabs>
        </Box>
        <Divider />

        <Box sx={{ px: 2, pb: 2 }}>
          <TabPanel value={tab} index={0}>
            {!patient ? (
              <Typography variant="body2" color="text.secondary">Patient niet gevonden.</Typography>
            ) : (
              <Stack spacing={1}>
                <Typography><b>Naam:</b> {patient.firstName} {patient.lastName}</Typography>
                <Typography><b>Geboortedatum:</b> {patient.birthDate ? String(patient.birthDate).slice(0, 10) : "-"}</Typography>
                <Typography><b>Geslacht:</b> {patient.gender ?? "-"}</Typography>
                <Typography><b>Allergieën:</b> {patient.allergies ?? "-"}</Typography>
                <Typography><b>Notities:</b> {patient.notes ?? "-"}</Typography>
              </Stack>
            )}
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>Contacten</Typography>
                {contactsLoading && <CircularProgress size={18} />}
                <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button variant="contained" onClick={() => openContactCreate("EMERGENCY")}>Nieuw noodcontact</Button>
                  <Button variant="contained" color="inherit" onClick={() => openContactCreate("GUARDIAN")} disabled={!isMinor}>
                    Nieuw contactpersoon (minderjarig)
                  </Button>
                  <Button variant="outlined" onClick={openContactEdit} disabled={!contactSelected}>Bewerken</Button>
                  <Button variant="outlined" color="error" onClick={removeContact} disabled={!contactSelected}>Verwijderen</Button>
                  <Button variant="outlined" onClick={loadContacts} disabled={contactsLoading}>Vernieuwen</Button>
                </Box>
              </Box>

              {isMinor ? (
                <Alert severity="info">
                  Patient is minderjarig. Voeg een contactpersoon/verzorger toe onder "Guardian".
                </Alert>
              ) : (
                <Alert severity="info">
                  Patient is niet minderjarig. Guardian-contacten kun je nog steeds opslaan, maar de UI knop is disabled.
                </Alert>
              )}

              <Typography sx={{ fontWeight: 600 }}>Guardian (contactpersoon)</Typography>
              <Paper variant="outlined">
                {guardians.map((c) => {
                  const isSel = c.id === contactSelectedId;
                  return (
                    <Box key={c.id} onClick={() => setContactSelectedId(c.id)} sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: isSel ? "action.selected" : "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
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

              <Typography sx={{ fontWeight: 600 }}>Noodcontact</Typography>
              <Paper variant="outlined">
                {emergencies.map((c) => {
                  const isSel = c.id === contactSelectedId;
                  return (
                    <Box key={c.id} onClick={() => setContactSelectedId(c.id)} sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: isSel ? "action.selected" : "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
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
            </Stack>
          </TabPanel>

          <TabPanel value={tab} index={2}><Alert severity="info">Diagnoses tab blijft zoals in fase 2.</Alert></TabPanel>
          <TabPanel value={tab} index={3}><Alert severity="info">Medicatie tab blijft zoals in fase 2.</Alert></TabPanel>
          <TabPanel value={tab} index={4}><Alert severity="info">Geschiedenis tab blijft zoals in fase 2.</Alert></TabPanel>
          <TabPanel value={tab} index={5}><Alert severity="info">Bestanden komen in fase 3B.</Alert></TabPanel>
        </Box>
      </Paper>

      <Dialog open={contactModalOpen} onClose={() => setContactModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{contactMode === "create" ? "Nieuw contact" : "Contact bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Type"
              select
              value={contactForm.type}
              onChange={(e) => setContactForm((s) => ({ ...s, type: e.target.value as ContactType }))}
              fullWidth
            >
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
    </Box>
  );
}
