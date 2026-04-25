import { ipcMain } from "electron";
import { getPrisma } from "../db";
import { requireRole } from "../guard";

export function registerDoctorsIpc() {


  ipcMain.handle("doctors:list", async (_e, { q }) => {
    requireRole(["ADMIN", "USER"]);
    const prisma = await getPrisma();

    return prisma.staff.findMany({
     
    where: {
        role: "DOCTOR",
        ...(q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
              ],q
            }
          : {}),
      },

      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  });

  ipcMain.handle("doctors:create", async (_e, { data }) => {
    requireRole(["ADMIN"]);
    const prisma = await getPrisma();
    return prisma.staff.create({ data });
  });

  ipcMain.handle("doctors:update", async (_e, { id, data }) => {
    requireRole(["ADMIN"]);
    const prisma = await getPrisma();
    return prisma.staff.update({ where: { id }, data });
  });

  ipcMain.handle("doctors:remove", async (_e, { id }) => {
    requireRole(["ADMIN"]);
    const prisma = await getPrisma();
    return prisma.staff.update({ where: { id }, data: { active: false } });
  });
}