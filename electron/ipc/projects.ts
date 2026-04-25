import { ipcMain } from "electron";
import { getPrisma } from "../db";
//import { requireRole } from "../guard";

export function registerProjectsIpc() {
  ipcMain.handle("projects:list", async (_e, { q }) => {
    //requireRole(["ADMIN", "USER"]);
    const prisma = await getPrisma();

    return prisma.project.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: [{ updatedAt: "desc" }],
    });
  });

  
  ipcMain.handle("projects:get", async (_e, { id }) => {
    const prisma = getPrisma();
    return prisma.project.findUnique({ where: { id } });
  });

  ipcMain.handle("projects:create", async (_e, { data }) => {
    //requireRole(["ADMIN"]);
    const prisma = await getPrisma();
    return prisma.project.create({ data });
  });

  ipcMain.handle("projects:update", async (_e, { id, data }) => {
    //requireRole(["ADMIN"]);
    const prisma = await getPrisma();
    return prisma.project.update({ where: { id }, data });
  });

  ipcMain.handle("projects:remove", async (_e, { id }) => {
    //requireRole(["ADMIN"]);
    const prisma = await getPrisma();
    return prisma.project.delete({ where: { id } });
  });
}