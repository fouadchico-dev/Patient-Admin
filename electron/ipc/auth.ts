import bcrypt from "bcryptjs";
import { ipcMain } from "electron";
import { getPrisma } from "../db";

let currentUserId: string | null = null;

type Session = {
  userId: string;
  username: string;
  role: "USER" | "MANAGER" | "ADMIN";
};

async function buildSession(userId: string): Promise<Session | null> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (!user.active) return null;
  return { userId: user.id, username: user.username, role: user.role };
}

export function registerAuthIpc() {
  ipcMain.handle(
    "auth:login",
    async (_e, { username, password }: { username: string; password: string }) => {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return null;
      if (!user.active) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      currentUserId = user.id;
      return { userId: user.id, username: user.username, role: user.role } as Session;
    }
  );

  ipcMain.handle("auth:logout", async () => {
    currentUserId = null;
    return true;
  });

  ipcMain.handle("auth:me", async () => {
    if (!currentUserId) return null;
    return buildSession(currentUserId);
  });
}
