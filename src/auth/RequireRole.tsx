import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./AuthProvider";

type Props = {
  anyOf?: Array<"USER" | "MANAGER" | "ADMIN">;
  fallbackTo?: string;
};

export default function RequireRole({ anyOf, fallbackTo = "/patients" }: Props) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (anyOf && anyOf.length > 0) {
    const ok = anyOf.includes((session as any).role);
    if (!ok) return <Navigate to={fallbackTo} replace />;
  }

  return <Outlet />;
}
