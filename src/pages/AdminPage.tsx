import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth/AuthProvider";

type UserRole = "USER" | "MANAGER" | "ADMIN";

export default function AdminPage() {
  const nav = useNavigate();
  const { session, refresh } = useAuth();

  const role = useMemo<UserRole>(() => {
    const r = (session as any)?.role;
    if (r === "ADMIN" || r === "MANAGER" || r === "USER") return r;
    return "USER";
  }, [session]);

  const isAdmin = role === "ADMIN";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      nav("/login", { replace: true });
      return;
    }
    if (!isAdmin) {
      setError("Je hebt geen ADMIN rechten.");
    } else {
      setError(null);
    }
  }, [session, isAdmin, nav]);

  const reseedRolesAndAdmin = async () => {
    // Optional: only works if you expose window.api.admin.bootstrap.
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const api = (window as any).api;
      if (!api?.admin?.bootstrap) {
        setInfo(
          "Geen admin.bootstrap API beschikbaar (optioneel). Bootstrap gebeurt normaal bij app-start (electron/bootstrap.ts)."
        );
        return;
      }
      await api.admin.bootstrap();
      await refresh();
      setInfo("✅ Bootstrap/seed uitgevoerd.");
    } catch (e: any) {
      setError(e?.message ?? "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  };

  const username = ((session as any)?.username ?? "-") as string;

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
            Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Admin-only tools en beheer.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`User: ${username}`} size="small" />
          <Chip label={`Rol: ${role}`} size="small" color={role === "ADMIN" ? "primary" : "default"} />
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {info && <Alert severity="info">{info}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Beheer</Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button variant="contained" onClick={() => nav("/staff")} disabled={!isAdmin}>
            Staff beheer
          </Button>
          <Button variant="outlined" onClick={() => nav("/patients")}>Patients</Button>
          <Button variant="outlined" onClick={() => nav("/appointments")}>Appointments</Button>
          <Button variant="outlined" onClick={() => nav("/calendar")}>Calendar</Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontWeight: 600, mb: 1 }}>Systeem</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={reseedRolesAndAdmin} disabled={busy || !isAdmin}>
            Seed roles/admin (optioneel)
          </Button>
          <Button variant="outlined" onClick={() => refresh()} disabled={busy}>
            Refresh session
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          Opmerking: "Seed roles/admin" werkt alleen als je een admin IPC expose't. In jouw reset-model is dit niet nodig.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Aanbevolen admin-only functies (later)</Typography>
        <Typography variant="body2" color="text.secondary">
          • Password reset voor users • Users activeren/deactiveren • Export tools • Database maintenance
        </Typography>
      </Paper>
    </Box>
  );
}
