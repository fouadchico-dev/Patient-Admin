import { getSession } from "./session";
import type { UserRole } from "@prisma/client";


export function requireAuth() {
  const s = getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}

export function requireRole(roles: UserRole[]) {
  const s = requireAuth();
  if (!roles.includes(s.role)) throw new Error("FORBIDDEN");
  return s;
}