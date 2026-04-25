import { ipcMain } from "electron";
import { getPrisma } from "../db";

// Staff-centric Appointments IPC (no doctor/assistant fields)
export function registerAppointmentsIpc() {
  ipcMain.handle(
    "appointments:range",
    async (_e, { startISO, endISO, filters }) => {
      const prisma = getPrisma();
      const start = new Date(startISO);
      const end = new Date(endISO);

      return prisma.appointment.findMany({
        where: {
          start: { gte: start, lt: end },
          ...(filters?.patientId ? { patientId: filters.patientId } : {}),
          ...(filters?.staffId ? { staffId: filters.staffId } : {}),
          ...(filters?.projectId ? { projectId: filters.projectId } : {}),
          ...(filters?.status ? { status: filters.status } : {}),
        },
        include: {
          patient: true,
          staff: true,
          project: true,
          treatmentPlanItem: true,
        },
        orderBy: { start: "asc" },
      });
    }
  );

  ipcMain.handle("appointments:create", async (_e, { data }) => {
    const prisma = getPrisma();

    // Optional validation: ensure staff is assigned to project+patient
    /*
    if (data.projectId && data.staffId) {

      const ok = await prisma.projectTreatment.findFirst({
        where: {
          projectId: data.projectId,
          patientId: data.patientId,
          staffId: data.staffId,
        },
      });

      if (!ok) {
        throw new Error("INVALID_TREATMENT_ASSIGNMENT");
      }
    }
    */
   
    return prisma.appointment.create({ data });
  });

  ipcMain.handle("appointments:update", async (_e, { id, data }) => {
    const prisma = getPrisma();
    return prisma.appointment.update({
      where: { id },
      data,
    });
  });

  ipcMain.handle("appointments:remove", async (_e, { id }) => {
    const prisma = getPrisma();
    return prisma.appointment.delete({ where: { id } });
  });
}
