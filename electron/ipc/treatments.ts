import { ipcMain } from "electron";
import { getPrisma } from "../db";
import { requireRole } from "../guard";

export function registerTreatmentsIpc() {
  ipcMain.handle("treatments:listByProject", async (_e, { projectId }) => {
    requireRole(["ADMIN", "USER"]);
    const prisma = await getPrisma();

    return prisma.projectTreatment.findMany({
      where: { projectId },
      include: { patient: true, doctor: true },
      //orderBy: [{ createdAt: "desc" }],
    });
  });


  
  ipcMain.handle("treatments:update", async (_e, { id, data }) => {
    requireRole(["ADMIN", "USER"]);
    const prisma = getPrisma();
    return prisma.projectTreatment.update({ where: { id }, data });
  });
 
  ipcMain.handle("treatments:add", async (_e, { data }) => {
    requireRole(["ADMIN", "USER"]);
    const prisma = await getPrisma();
    return prisma.projectTreatment.create({ data });
  });


  ipcMain.handle("treatments:remove", async (_e, { id }) => {
    requireRole(["ADMIN", "USER"]);
    const prisma = getPrisma();
    return prisma.projectTreatment.delete({ where: { id } });
  });
}