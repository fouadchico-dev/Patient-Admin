import { ipcMain } from "electron";
import { getPrisma } from "../db";

// Staff who have the role name "ASSISTANT" via UserRole -> Role
const ROLE_NAME = "ASSISTANT";

export function registerAssistantsIpc() {
  ipcMain.handle("assistants:list", async (_e, { q }: { q?: string }) => {
    const prisma = getPrisma();

    return prisma.staff.findMany({
      where: 
      {
          role:  ROLE_NAME,
          ...(q
            ? {
                OR: [
                  { firstName: { contains: q } },
                  { lastName: { contains: q } },
                  { email: { contains: q } },
                  { phone: { contains: q } },
                ],
              }
            : {}),
        },

      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  });

  // NOTE: In your current model, every Staff should also be a User with roles.
  // Creating Assistants properly should be done via a Staff+User creation IPC (transaction).
  // This endpoint only creates Staff record (no login). Use it only if you already have another flow.
  ipcMain.handle("assistants:create", async (_e, { data }: { data: any }) => {
    const prisma = getPrisma();
    return prisma.staff.create({ data });
  });

  ipcMain.handle("assistants:update", async (_e, { id, data }: { id: string; data: any }) => {
    const prisma = getPrisma();
    return prisma.staff.update({ where: { id }, data });
  });

  // Soft deactivate
  ipcMain.handle("assistants:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    return prisma.staff.update({ where: { id }, data: { active: false } });
  });
}
