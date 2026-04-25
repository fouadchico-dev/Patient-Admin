import type {UserRole} from "@prisma/client"
//export type Session = { userId: string; role: "ADMIN" | "USER"; username: string };
export type Session = {
    userId: string; 
    username: string; 
    role: UserRole; //"USER" | "MANAGER" | "ADMIN"; 
  };

let session: Session | null = null;

export function setSession(s: Session | null) {
  session = s;
}

export function getSession() {
  return session;
}