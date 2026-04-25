import { useEffect, useMemo, useState } from "react";


import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArticleIcon from "@mui/icons-material/Article";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";



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

type PatientFileCategory = "PHOTO" | "SCAN" | "LAB" | "OTHER";

type PatientFile = {
  id: string;
  patientId: string;
  originalName: string;
  mimeType: string;
  size: number;
  caption?: string | null;
  category: PatientFileCategory;
  tags?: string | null;
  isArchived: boolean;
  uploadedAt: string;
};

type Filters = {
  q: string;
  category: "ALL" | PatientFileCategory;
  includeArchived: boolean;
  sort: "uploadedAt_desc" | "uploadedAt_asc" | "name_asc" | "name_desc";
};

type ThumbResponse = { dataUrl: string | null; error?: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function isImageMime(m: string) {
  return (m || "").startsWith("image/");
}

function fileIconFor(mimeType: string, fileName: string) {
  const m = (mimeType || "").toLowerCase();
  const n = (fileName || "").toLowerCase();

  const isPdf = m === "application/pdf" || n.endsWith(".pdf");
  const isWord =
    m === "application/msword" ||
    m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    n.endsWith(".doc") ||
    n.endsWith(".docx");

  if (isPdf) return { Icon: PictureAsPdfIcon, color: "#d32f2f" }; // rood
  if (isWord) return { Icon: ArticleIcon, color: "#1976d2" }; // blauw

  return { Icon: InsertDriveFileIcon, color: "#607d8b" }; // grijs
}


export default function PatientFilesTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    category: "ALL",
    includeArchived: false,
    sort: "uploadedAt_desc",
  });

  const [items, setItems] = useState<PatientFile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  const [metaOpen, setMetaOpen] = useState(false);
  const [meta, setMeta] = useState({ caption: "", category: "OTHER" as PatientFileCategory, tags: "", isArchived: false });

  // thumbnails: id -> dataUrl
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const load = async (f?: Partial<Filters>) => {
    if (!window.api.patientFiles?.listByPatient) {
      setError("patientFiles endpoints ontbreken");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = { ...filters, ...(f ?? {}) };
      const list: PatientFile[] = await window.api.patientFiles.listByPatient(patientId, next);
      setItems(list || []);
      if (selectedId && !(list || []).some((x: any) => x.id === selectedId)) setSelectedId("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  // Load list initially
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Reload when filters change (debounced)
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.category, filters.includeArchived, filters.sort]);

  // Fetch thumbnails for up to first 30 image items (lazy)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!window.api.patientFiles?.getThumbnail) return;

      const candidates = items.filter((x) => isImageMime(x.mimeType)).slice(0, 30);
      const missing = candidates.filter((x) => !thumbs[x.id]);
      if (missing.length === 0) return;

      // simple sequential fetch to avoid spamming IPC
      for (const f of missing) {
        if (cancelled) return;
        try {
          const res: ThumbResponse = await window.api.patientFiles.getThumbnail(f.id);
          if (cancelled) return;
          if (res?.dataUrl) {
            setThumbs((s) => ({ ...s, [f.id]: res.dataUrl as string }));
          }
        } catch {
          // ignore
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const upload = async () => {
    setError(null);
    try {
      await window.api.patientFiles.pickAndUpload(patientId, {
        category: filters.category === "ALL" ? undefined : filters.category,
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    }
  };

  const open = async () => {
    if (!selected) return;
    try {
      await window.api.patientFiles.open(selected.id);
    } catch (e: any) {
      setError(e?.message ?? "Open failed");
    }
  };

  const reveal = async () => {
    if (!selected) return;
    try {
      await window.api.patientFiles.reveal(selected.id);
    } catch (e: any) {
      setError(e?.message ?? "Reveal failed");
    }
  };

  const archiveToggle = async () => {
    if (!selected) return;
    try {
      await window.api.patientFiles.update(selected.id, { isArchived: !selected.isArchived });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Archive failed");
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm(`Bestand permanent verwijderen: ${selected.originalName}?`)) return;
    try {
      await window.api.patientFiles.remove(selected.id);
      setSelectedId("");
      setThumbs((s) => {
        const n = { ...s };
        delete n[selected.id];
        return n;
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  };

  const editMeta = () => {
    if (!selected) return;
    setMeta({
      caption: selected.caption ?? "",
      category: selected.category ?? "OTHER",
      tags: selected.tags ?? "",
      isArchived: !!selected.isArchived,
    });
    setMetaOpen(true);
  };

  const saveMeta = async () => {
    if (!selected) return;
    try {
      await window.api.patientFiles.update(selected.id, {
        caption: meta.caption || null,
        category: meta.category,
        tags: meta.tags || null,
        isArchived: meta.isArchived,
      });
      setMetaOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Update failed");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 700 }}>Bestanden</Typography>
        {loading && <CircularProgress size={18} />}
        <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={upload}>Upload</Button>
          <Button variant="outlined" onClick={open} disabled={!selected}>Open</Button>
          <Button variant="outlined" onClick={reveal} disabled={!selected}>Toon in map</Button>
          <Button variant="outlined" onClick={editMeta} disabled={!selected}>Eigenschappen</Button>
          <Button variant="outlined" onClick={archiveToggle} disabled={!selected}>
            {selected?.isArchived ? "Terugzetten" : "Archiveren"}
          </Button>
          <Button variant="outlined" color="error" onClick={remove} disabled={!selected}>Permanent verwijderen</Button>
          <Button variant="outlined" onClick={() => load()} disabled={loading}>Vernieuwen</Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
          <TextField
            size="small"
            label="Zoeken"
            placeholder="naam / caption / tags"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            sx={{ minWidth: { xs: "100%", sm: 260 } }}
          />

          <TextField
            size="small"
            label="Categorie"
            select
            value={filters.category}
            onChange={(e) => setFilters((s) => ({ ...s, category: e.target.value as any }))}
            sx={{ minWidth: { xs: "100%", sm: 190 } }}
          >
            <MenuItem value="ALL">Alle</MenuItem>
            <MenuItem value="PHOTO">Foto</MenuItem>
            <MenuItem value="SCAN">Scan</MenuItem>
            <MenuItem value="CONSENT">Consent</MenuItem>
            <MenuItem value="LAB">Lab</MenuItem>
            <MenuItem value="OTHER">Overig</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Sort"
            select
            value={filters.sort}
            onChange={(e) => setFilters((s) => ({ ...s, sort: e.target.value as any }))}
            sx={{ minWidth: { xs: "100%", sm: 210 } }}
          >
            <MenuItem value="uploadedAt_desc">Nieuwste eerst</MenuItem>
            <MenuItem value="uploadedAt_asc">Oudste eerst</MenuItem>
            <MenuItem value="name_asc">Naam A-Z</MenuItem>
            <MenuItem value="name_desc">Naam Z-A</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Gearchiveerd"
            select
            value={filters.includeArchived ? "yes" : "no"}
            onChange={(e) => setFilters((s) => ({ ...s, includeArchived: e.target.value === "yes" }))}
            sx={{ minWidth: { xs: "100%", sm: 170 } }}
          >
            <MenuItem value="no">Verberg</MenuItem>
            <MenuItem value="yes">Toon</MenuItem>
          </TextField>

          <Box sx={{ ml: { sm: "auto" }, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{items.length} bestanden</Typography>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="warning">{error}</Alert>}

      <Paper variant="outlined">
        {items.map((f) => {
          const isSel = f.id === selectedId;
          const thumb = thumbs[f.id];
          return (
            <Box
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              sx={{
                display: "flex",
                gap: 1.5,
                px: 2,
                py: 1.25,
                cursor: "pointer",
                bgcolor: isSel ? "action.selected" : "background.paper",
                "&:hover": { bgcolor: isSel ? "action.selected" : "action.hover" },
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                  sx={{
                    width: 88,
                    height: 64,
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {thumb ? (
                    <Box component="img" src={thumb} alt={f.originalName} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : isImageMime(f.mimeType) ? (
                    <Typography variant="caption" color="text.secondary">
                      img
                    </Typography>
                  ) : (
                    (() => {
                      const { Icon, color } = fileIconFor(f.mimeType, f.originalName);
                      return <Icon sx={{ fontSize: 34, color }} />;
                    })()
                  )}
                </Box>

              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {f.originalName}
                  <Chip label={f.category} size="small" sx={{ ml: 1 }} />
                  {f.isArchived ? <Chip label="archived" size="small" sx={{ ml: 1 }} /> : null}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {f.mimeType} • {formatBytes(f.size)} • {String(f.uploadedAt).slice(0, 19).replace("T", " ")}
                </Typography>
                {f.caption ? <Typography variant="body2" color="text.secondary">{f.caption}</Typography> : null}
                {f.tags ? <Typography variant="caption" color="text.secondary">tags: {f.tags}</Typography> : null}
              </Box>
            </Box>
          );
        })}

        {!loading && items.length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">Geen bestanden gevonden.</Typography>
          </Box>
        ) : null}
      </Paper>

      <Dialog open={metaOpen} onClose={() => setMetaOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Bestand eigenschappen</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Categorie"
              select
              value={meta.category}
              onChange={(e) => setMeta((s) => ({ ...s, category: e.target.value as PatientFileCategory }))}
              fullWidth
            >
              <MenuItem value="PHOTO">Foto</MenuItem>
              <MenuItem value="SCAN">Scan</MenuItem>
              <MenuItem value="CONSENT">Consent</MenuItem>
              <MenuItem value="LAB">Lab</MenuItem>
              <MenuItem value="OTHER">Overig</MenuItem>
            </TextField>

            <TextField label="Tags (comma separated)" value={meta.tags} onChange={(e) => setMeta((s) => ({ ...s, tags: e.target.value }))} fullWidth />

            <TextField
              label="Caption"
              value={meta.caption}
              onChange={(e) => setMeta((s) => ({ ...s, caption: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <TextField
              label="Gearchiveerd"
              select
              value={meta.isArchived ? "yes" : "no"}
              onChange={(e) => setMeta((s) => ({ ...s, isArchived: e.target.value === "yes" }))}
              fullWidth
            >
              <MenuItem value="no">Nee</MenuItem>
              <MenuItem value="yes">Ja</MenuItem>
            </TextField>

            <Divider />

            <Alert severity="info">Tip: gebruik Archiveren i.p.v. verwijderen om het dossier compleet te houden.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetaOpen(false)} variant="outlined">Annuleren</Button>
          <Button onClick={saveMeta} variant="contained">Opslaan</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
