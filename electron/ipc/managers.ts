import { ipcMain } from "electron";
import { getPrisma } from "../db";

// Staff who have the role name "MANAGER" via UserRole -> Role
const ROLE_NAME = "MANAGER";

function buildWhere(q?: string) {
  const query = (q ?? "").trim();

  const base: any = {
    active: true,
    user: {
      is: {
        active: true,
        roles: {
          some: {
            role: { is: { name: ROLE_NAME } },
          },
        },
      },
    },
  };

  if (!query) return base;

  return {
    ...base,
    OR: [
      { firstName: { contains: query } },
      { lastName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
    ],
  };
}

export function registerManagersIpc() {
  ipcMain.handle("managers:list", async (_e, { q }: { q?: string }) => {
    const prisma = getPrisma();

    return prisma.staff.findMany({
      where: buildWhere(q),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { user: true },
    });
  });

  // Same note as assistants: should be created with User+roles in a transaction.
  ipcMain.handle("managers:create", async (_e, { data }: { data: any }) => {
    const prisma = getPrisma();
    return prisma.staff.create({ data });
  });

  ipcMain.handle("managers:update", async (_e, { id, data }: { id: string; data: any }) => {
    const prisma = getPrisma();
    return prisma.staff.update({ where: { id }, data });
  });

  ipcMain.handle("managers:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    return prisma.staff.update({ where: { id }, data: { active: false } });
  });
}
