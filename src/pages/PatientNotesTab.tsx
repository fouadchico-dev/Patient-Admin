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
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import StickyNote2Outlined from "@mui/icons-material/StickyNote2Outlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import LinkOutlined from "@mui/icons-material/LinkOutlined";

declare global {
  interface Window {
    api: any;
  }
}

type NoteType = "GENERAL" | "CONSULT" | "PROGRESS" | "INTERNAL";

type Note = {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  title: string; // stores type
  content?: string | null;
  notedAt: string;
};

const TYPE_OPTIONS: { value: NoteType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Alle types" },
  { value: "GENERAL", label: "Algemeen" },
  { value: "CONSULT", label: "Consult" },
  { value: "PROGRESS", label: "Voortgang" },
  { value: "INTERNAL", label: "Intern" },
];

const SCOPE_OPTIONS: { value: "ALL" | "APPOINTMENT" | "GENERAL"; label: string }[] = [
  { value: "ALL", label: "Alles" },
  { value: "APPOINTMENT", label: "Alleen afspraak-notities" },
  { value: "GENERAL", label: "Alleen algemene notities" },
];

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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function previewText(s?: string | null, max = 120) {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export default function PatientNotesTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  const [filters, setFilters] = useState({
    q: "",
    type: "ALL" as NoteType | "ALL",
    scope: "ALL" as "ALL" | "APPOINTMENT" | "GENERAL",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({
    type: "GENERAL" as NoteType,
    content: "",
    notedAt: "",
    appointmentId: "" as string, // optional
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.api.patientNotes?.listByPatient) {
        setError("patientNotes endpoints ontbreken.");
        setItems([]);
        return;
      }
      const list: Note[] = await window.api.patientNotes.listByPatient(patientId);
      const safe = (list || []).slice();
      setItems(safe);
      if (selectedId && !safe.some((n) => n.id === selectedId)) setSelectedId("");
      if (!selectedId && safe.length) setSelectedId(safe[0].id);
    } catch (e: any) {
      setError(e?.message ?? "Kon notities niet laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return (items || []).filter((n) => {
      const typeOk = filters.type === "ALL" ? true : n.title === filters.type;
      const scopeOk =
        filters.scope === "ALL"
          ? true
          : filters.scope === "APPOINTMENT"
            ? !!n.appointmentId
            : !n.appointmentId;
      const text = `${n.title} ${n.content ?? ""}`.toLowerCase();
      const qOk = q ? text.includes(q) : true;
      return typeOk && scopeOk && qOk;
    });
  }, [items, filters]);

  const closeModal = () => setModalOpen(false);

  const openCreate = () => {
    setMode("create");
    setForm({ type: "GENERAL", content: "", notedAt: "", appointmentId: "" });
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setMode("edit");
    setForm({
      type: (selected.title as NoteType) || "GENERAL",
      content: selected.content ?? "",
      notedAt: selected.notedAt ? toDatetimeLocal(new Date(selected.notedAt)) : "",
      appointmentId: selected.appointmentId ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError(null);
    try {
      if (!form.content.trim()) return setError("Notitie tekst is verplicht");

      const payload: any = {
        patientId,
        type: form.type,
        content: form.content,
        appointmentId: form.appointmentId ? form.appointmentId : null,
        notedAt: form.notedAt ? new Date(form.notedAt).toISOString() : null,
      };

      if (mode === "create") {
        await window.api.patientNotes.create(payload);
      } else {
        if (!selected) return;
        await window.api.patientNotes.update(selected.id, {
          type: payload.type,
          content: payload.content,
          appointmentId: payload.appointmentId,
          notedAt: payload.notedAt,
        });
      }

      closeModal();
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Opslaan mislukt");
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm("Notitie verwijderen?")) return;
    setError(null);
    try {
      await window.api.patientNotes.remove(selected.id);
      setSelectedId("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Verwijderen mislukt");
    }
  };

  const leftList = (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <StickyNote2Outlined fontSize="small" />
        <Typography sx={{ fontWeight: 800 }}>Notities</Typography>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          {loading && <CircularProgress size={18} />}
          <Typography variant="body2" color="text.secondary">{filtered.length}</Typography>
        </Box>
      </Box>
      <Divider />

      <Box sx={{ p: 1.5 }}>
        <Stack spacing={1.25}>
          <TextField
            size="small"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            placeholder="Zoek in notities…"
slotProps={{
  input: {
    startAdornment: (
      <InputAdornment position="start">
        <SearchOutlined fontSize="small" />
      </InputAdornment>
    ),
  },
}}

          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              select
              label="Type"
              value={filters.type}
              onChange={(e) => setFilters((s) => ({ ...s, type: e.target.value as any }))}
              fullWidth
             
             
              slotProps={{
  input: {
    startAdornment: (
      <InputAdornment position="start">
        <FilterAltOutlined fontSize="small" />
      </InputAdornment>
    ),
  },
}}
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              select
              label="Scope"
              value={filters.scope}
              onChange={(e) => setFilters((s) => ({ ...s, scope: e.target.value as any }))}
              fullWidth
              slotProps={{ select: { MenuProps: { disablePortal: true } } }}
            >
              {SCOPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>
              Nieuwe notitie
            </Button>
            <Button variant="outlined" startIcon={<EditOutlined />} onClick={openEdit} disabled={!selected}>
              Bewerken
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineOutlined />} onClick={remove} disabled={!selected}>
              Verwijderen
            </Button>
            <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={load} disabled={loading}>
              Vernieuwen
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
        {filtered.map((n) => {
          const isSel = n.id === selectedId;
          return (
            <Box
              key={n.id}
              onClick={() => setSelectedId(n.id)}
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip label={labelForType(n.title)} size="small" color={chipColor(n.title)} />
                {n.appointmentId ? (
                  <Chip icon={<LinkOutlined fontSize="small" />} label="Afspraak" size="small" variant="outlined" />
                ) : null}
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                  {fmtDateTime(n.notedAt)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {previewText(n.content)}
              </Typography>
            </Box>
          );
        })}

        {!loading && filtered.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">Geen notities gevonden.</Typography>
          </Box>
        ) : null}
      </Box>
    </Paper>
  );

  const rightPreview = (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 800 }}>Details</Typography>
        <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" size="small" startIcon={<EditOutlined />} onClick={openEdit} disabled={!selected}>
            Bewerken
          </Button>
        </Box>
      </Box>
      <Divider sx={{ mb: 1.5 }} />

      {!selected ? (
        <Typography variant="body2" color="text.secondary">Selecteer een notitie.</Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip label={labelForType(selected.title)} size="small" color={chipColor(selected.title)} />
            {selected.appointmentId ? <Chip label="Afspraak" size="small" variant="outlined" /> : <Chip label="Algemeen" size="small" variant="outlined" />}
            <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
              {fmtDateTime(selected.notedAt)}
            </Typography>
          </Box>

          {selected.appointmentId ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              Afspraak-ID: {selected.appointmentId}
            </Typography>
          ) : null}

          <Typography sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}>
            {(selected.content ?? "").trim() || "-"}
          </Typography>
        </>
      )}
    </Paper>
  );

  return (
    <Stack spacing={2}>
      {error && <Alert severity="warning">{error}</Alert>}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "420px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {leftList}
        {rightPreview}
      </Box>

      {/* Create/Edit dialog */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuwe notitie" : "Notitie bewerken"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Type"
                select
                value={form.type}
                onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as NoteType }))}
                fullWidth
                slotProps={{ select: { MenuProps: { disablePortal: true } } }}
              >
                <MenuItem value="GENERAL">Algemeen</MenuItem>
                <MenuItem value="CONSULT">Consult</MenuItem>
                <MenuItem value="PROGRESS">Voortgang</MenuItem>
                <MenuItem value="INTERNAL">Intern</MenuItem>
              </TextField>

              <TextField
                label="Datum/tijd"
                type="datetime-local"
                value={form.notedAt}
                onChange={(e) => setForm((s) => ({ ...s, notedAt: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>

            <TextField
              label="Afspraak-ID (optioneel)"
              value={form.appointmentId}
              onChange={(e) => setForm((s) => ({ ...s, appointmentId: e.target.value }))}
              fullWidth
              helperText="Laat leeg voor een algemene notitie. Vul alleen als je handmatig wilt koppelen."
            />

            <TextField
              label="Notitie"
              value={form.content}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              multiline
              minRows={8}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={closeModal}>Annuleren</Button>
          <Button variant="contained" onClick={save}>Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
