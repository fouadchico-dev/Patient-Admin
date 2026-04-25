import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// MUI
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { session, loading, login } = useAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where to go after login:
  const redirectTo = useMemo(() => {
    const st = location.state as any;
    return st?.from || "/patients";
  }, [location.state]);

  // If already logged in, redirect away from login page
  useEffect(() => {
    if (!loading && session) {
      nav(redirectTo, { replace: true });
    }
  }, [loading, session, nav, redirectTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username, password);
      nav(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Login mislukt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              PatientenAdmin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log in om verder te gaan
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Gebruikersnaam"
                value= {username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                fullWidth
              />

              <TextField
                label="Wachtwoord"
                type="password"
                value= {password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                sx={{ mt: 1 }}
              >
                {submitting ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Inloggen"
                )}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Tip: standaard admin account is beschikbaar als je bootstrap gebruikt.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}