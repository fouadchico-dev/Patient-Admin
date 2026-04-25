// src/theme.ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      "Inter",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
    fontSize: 14,
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 700, letterSpacing: -0.2 },
    subtitle1: { fontWeight: 600 },
    body1: { fontSize: 15 },
    body2: { fontSize: 14, color: "rgba(0,0,0,0.72)" },
  },
  palette: {
    mode: "light",
    primary: { main: "#2563eb" },   // blauw dat “enterprise” voelt
    secondary: { main: "#7c3aed" }, // paars accent (optioneel)
    background: {
      default: "#f6f7fb",
      paper: "#ffffff",
    },
    divider: "rgba(0,0,0,0.08)",
  },
 
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid rgba(0,0,0,0.08)",
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0px 4px 10px rgba(0,0,0,0.06)",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 12, fontWeight: 650 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 3, borderRadius: 999 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: "none",
          fontWeight: 650,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0px 12px 40px rgba(0,0,0,0.18)",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
  },
});