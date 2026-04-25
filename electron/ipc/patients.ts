import { ipcMain } from "electron";
import { getPrisma } from "../db";
// optioneel: import { requireRole } from "../guard";

export function registerPatientsIpc() {
  ipcMain.handle("patients:list", async (_e, { q }: { q?: string }) => {
    // requireRole(["ADMIN", "USER"]);
    const prisma = getPrisma();

    return prisma.patient.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q} },
              { lastName: { contains: q } },
              { city: { contains: q } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  });

  ipcMain.handle("patients:get", async (_e, { id }: { id: string }) => {
    console.log("patients get ");
    const prisma = getPrisma();
    return prisma.patient.findUnique({
      where: { id },
      include: { photos: true },
    });
  });

  ipcMain.handle("patients:create", async (_e, { data }: { data: any }) => {
    const prisma = getPrisma();
    return prisma.patient.create({ data });
  });

  ipcMain.handle("patients:update", async (_e, { id, data }: { id: string; data: any }) => {
    const prisma = getPrisma();
    return prisma.patient.update({ where: { id }, data });
  });

  ipcMain.handle("patients:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    return prisma.patient.delete({ where: { id } });
  });
}