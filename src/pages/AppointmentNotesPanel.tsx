import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from "@mui/material";

declare global {
  interface Window {
    api: any;
  }
}

type Note = {
  id: string;
  title: string;
  content?: string | null;
  notedAt: string;
};

function labelForType(t: string) {
  switch (t) {
    case "GENERAL":
      return "Algemeen";
    case "CONSULT":
      return "Consult";
    case "PROGRESS":
      return "Voortgang";
    case "INTERNAL":
      return "Intern";
    default:
      return t;
  }
}

function chipColor(t: string): any {
  if (t === "CONSULT") return "info";
  if (t === "PROGRESS") return "success";
  if (t === "INTERNAL") return "warning";
  return "default";
}

export default function AppointmentNotesPanel({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Note[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list: Note[] = await window.api.patientNotes.listByAppointment(appointmentId);
      setItems(list || []);
    } catch (e: any) {
      setError(e?.message ?? "Kon notities voor afspraak niet laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appointmentId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 600 }}>Notities bij deze afspraak</Typography>
        {loading && <CircularProgress size={18} />}
        <Box sx={{ ml: "auto" }}>
          <Typography variant="body2" color="text.secondary">
            {items.length} notities
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {items.map((n) => (
        <Box key={n.id} sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip label={labelForType(n.title)} size="small" color={chipColor(n.title)} />
            <Typography variant="body2" color="text.secondary">
              {String(n.notedAt).slice(0, 19).replace("T", " ")}
            </Typography>
          </Box>
          <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
            {n.content ?? ""}
          </Typography>
        </Box>
      ))}

      {!loading && items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nog geen notities voor deze afspraak.
        </Typography>
      )}
    </Paper>
  );
}
