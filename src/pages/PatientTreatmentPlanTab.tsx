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

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  role: "DOCTOR" | "ASSISTANT";
};

type Appointment = {
  id: string;
  start: string;
  end: string;
  staff?: Staff | null;
};

type TreatmentPlanItem = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  notes?: string | null;
  appointments: Appointment[];
};

export default function PatientTreatmentPlanTab({ patientId }: { patientId: string }) {
  const navigate = useNavigate();

  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    status: "OPEN" as TreatmentPlanItem["status"],
    notes: "",
  });

  const withAppt = useMemo(
    () => items.filter((x) => (x.appointments?.length ?? 0) > 0).length,
    [items]
  );
  const withoutAppt = useMemo(() => items.length - withAppt, [items, withAppt]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list: TreatmentPlanItem[] = await window.api.patientTreatmentPlan.listByPatient(patientId);
      setItems(list || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load treatment plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const openCreate = () => {
    setEditItemId(null);
    setForm({ title: "", status: "OPEN", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: TreatmentPlanItem) => {
    setEditItemId(item.id);
    setForm({ title: item.title, status: item.status, notes: item.notes ?? "" });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (!form.title.trim()) {
        setError("Titel is verplicht");
        return;
      }

      if (editItemId) {
        await window.api.patientTreatmentPlan.update(editItemId, {
          title: form.title,
          status: form.status,
          notes: form.notes || null,
        });
      } else {
        await window.api.patientTreatmentPlan.create({
          patientId,
          title: form.title,
          status: form.status,
          notes: form.notes || null,
        });
      }

      setDialogOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Behandelplan item verwijderen?")) return;
    try {
      await window.api.patientTreatmentPlan.remove(id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  };

  const createAppointmentForItem = (itemId: string) => {
    navigate("/appointments", {
      state: {
        patientId,
        fromTreatmentPlanItemId: itemId,
      },
    });
  };

  const openAppointment = (appointmentId: string) => {
    navigate("/appointments", {
      state: {
        appointmentId,
      },
    });
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Behandelplan
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {withAppt} met afspraak · {withoutAppt} zonder afspraak
        </Typography>
        {loading && <CircularProgress size={18} />}
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" onClick={openCreate}>
            Nieuw item
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        {items.map((item) => {
          const hasAppt = (item.appointments?.length ?? 0) > 0;
          return (
            <Box
              key={item.id}
              sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
                <Chip label={item.status} size="small" />
                <Chip
                  label={hasAppt ? "✅ Afspraak" : "⏳ Geen afspraak"}
                  size="small"
                  color={hasAppt ? "success" : "default"}
                />

                <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => createAppointmentForItem(item.id)}
                  >
                    Nieuwe afspraak
                  </Button>
                  <Button size="small" onClick={() => openEdit(item)}>
                    Bewerken
                  </Button>
                  <Button size="small" color="error" onClick={() => remove(item.id)}>
                    Verwijderen
                  </Button>
                </Box>
              </Box>

              {item.notes && (
                <Typography variant="body2" color="text.secondary">
                  {item.notes}
                </Typography>
              )}

              {hasAppt && (
                <Box sx={{ mt: 1, pl: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Afspraken:
                  </Typography>
                  {item.appointments.map((a) => (
                    <Typography
                      key={a.id}
                      variant="body2"
                      sx={{ cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => openAppointment(a.id)}
                    >
                      • {new Date(a.start).toLocaleString()} – {new Date(a.end).toLocaleTimeString()}
                      {a.staff ? ` (${a.staff.firstName} ${a.staff.lastName})` : ""}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Nog geen behandelplan items.
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>
          {editItemId ? "Behandelplan item bewerken" : "Nieuw behandelplan item"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Titel"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Status"
              select
              value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as TreatmentPlanItem["status"] }))}
              fullWidth
            >
              <MenuItem value="OPEN">Open</MenuItem>
              <MenuItem value="IN_PROGRESS">Bezig</MenuItem>
              <MenuItem value="DONE">Afgerond</MenuItem>
              <MenuItem value="CANCELLED">Geannuleerd</MenuItem>
            </TextField>

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
          <Button onClick={() => setDialogOpen(false)}>Annuleren</Button>
          <Button variant="contained" onClick={save}>Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
