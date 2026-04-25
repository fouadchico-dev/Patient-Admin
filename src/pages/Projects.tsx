import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type FormState = {
  name: string;
  description: string;
  status: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
};

const emptyForm: FormState = {
  name: "",
  description: "",
  status: "active",
  startDate: "",
  endDate: "",
};


const STATUS_OPTIONS = [
  { value: "", label: "Alle statussen" },
  { value: "active", label: "active" },
  { value: "finished", label: "finished" },
  { value: "on-hold", label: "on-hold" },
];

export default function Projects() {
  const nav = useNavigate();
  const [session, setSession] = useState<any>(null);

  // ✅ search query
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(""); // "" = alle statussen

  // list + selection
  const [items, setItems] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId]
  );

  // ui state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  // ✅ 1) Auth + initial load (once)
  useEffect(() => {
    (async () => {
      const me = await window.api.auth.me();
      if (!me) {
        nav("/login");
        return;
      }
      setSession(me);

      // initial: show all projects
      await loadAll("","");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 2) Debounced search (when q changes)
  useEffect(() => {
    const t = setTimeout(() => {
      loadAll(q, status);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const loadAll = async (query?: string, statusFilter?: string) => {
    setLoading(true);
    setError(null);

    try {
      const list: Project[] = await window.api.projects.list((query ?? "").trim());
      
      
     const filtered =
      statusFilter && statusFilter.trim() !== ""
        ? (list || []).filter((p) => (p.status ?? "") === statusFilter)
        : (list || []);

      setItems(filtered);


      //setItems(list || []);

      // keep selection valid
      //if (selectedId && !(list || []).some((x) => x.id === selectedId)) {
      if (selectedId && !filtered.some((x) => x.id === selectedId)) { 
        setSelectedId("");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load projects");
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
      name: selected.name ?? "",
      description: selected.description ?? "",
      status: selected.status ?? "active",
      startDate: selected.startDate ? String(selected.startDate).slice(0, 10) : "",
      endDate: selected.endDate ? String(selected.endDate).slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const save = async () => {
    setError(null);

    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status || null,
        startDate: form.startDate ? new Date(form.startDate) : null,
        endDate: form.endDate ? new Date(form.endDate) : null,
      };

      if (!payload.name) {
        setError("Projectnaam is verplicht.");
        return;
      }

      if (mode === "create") {
        const created: Project = await window.api.projects.create(payload);
        setSelectedId(created.id);
      } else {
        if (!selected) return;
        await window.api.projects.update(selected.id, payload);
      }

      closeModal();
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm(`Project verwijderen: ${selected.name}?`)) return;

    setError(null);
    try {
      await window.api.projects.remove(selected.id);
      setSelectedId("");
      await loadAll(q);
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  };


  const selectedLabel = selected ? `${selected.name}` : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
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
            Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Logged in as: {session?.username ?? "-"} ({session?.role ?? "-"})
          </Typography>
        </Box>

        {/* Search + Status */}
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            sx={{ alignItems: { xs: "stretch", sm: "center" } }}
          >
            <TextField
              size="small"
              label="Zoeken"
              placeholder="Naam / beschrijving…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 320 } }}
            />

            <TextField
              size="small"
              label="Status"
              select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 200 } }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Button variant="contained" onClick={() => loadAll(q, status)}>
              Zoeken
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setQ("");
                setStatus("");
                loadAll("", "");
              }}
            >
              Reset
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { sm: "auto" } }}>
              {loading && <CircularProgress size={18} />}
              <Typography variant="body2" color="text.secondary">
                {loading ? "Laden…" : `${items.length} projects`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
          <Button variant="contained" onClick={openCreate}>
            Nieuw
          </Button>

          <Button variant="contained" color="inherit" onClick={openEdit} disabled={!selected}>
            Bewerken
          </Button>

          <Button variant="contained" color="error" onClick={remove} disabled={!selected}>
            Verwijderen
          </Button>

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

        {items.map((p) => {
          const isSelected = p.id === selectedId;

          return (
            <Box
              key={p.id}
              onClick={() => setSelectedId(p.id)}
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
                    {p.name}{" "}
                    {p.status && <Chip label={p.status} size="small" sx={{ ml: 1 }} />}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {(p.startDate ? String(p.startDate).slice(0, 10) : "-")} →{" "}
                    {(p.endDate ? String(p.endDate).slice(0, 10) : "-")}
                  </Typography>

                  {p.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {p.description}
                    </Typography>
                  )}
                </Box>

                {isSelected && <Chip label="✓" size="small" color="primary" />}
              </Box>
            </Box>
          );
        })}

        {!loading && items.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Geen projects gevonden.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Modal */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>{mode === "create" ? "Nieuw project" : "Project bewerken"}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Projectnaam"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Beschrijving"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <TextField
              label="Status"
              select
              value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
              fullWidth
            >
              {STATUS_OPTIONS.filter((x) => x.value !== "").map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Startdatum"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} // MUI v6+ API [2](https://medium.com/@bchirag/how-to-set-up-material-ui-theming-in-your-react-project-441dc2f728b7)[3](https://themewagon.com/blog/how-to-install-material-ui-in-your-react-project/)
                fullWidth
              />
              <TextField
                label="Einddatum"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} // MUI v6+ API [2](https://medium.com/@bchirag/how-to-set-up-material-ui-theming-in-your-react-project-441dc2f728b7)[3](https://themewagon.com/blog/how-to-install-material-ui-in-your-react-project/)
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
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