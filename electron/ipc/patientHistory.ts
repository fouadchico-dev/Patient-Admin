import { ipcMain } from "electron";
import { getPrisma } from "../db";

export function registerPatientHistoryIpc() {
  ipcMain.handle("patientHistory:listByPatient", async (_e, { patientId }: { patientId: string }) => {
    const prisma = getPrisma();
    if (!patientId) throw new Error("PATIENT_ID_REQUIRED");
    return prisma.patientTreatmentHistory.findMany({
      where: { patientId },
      orderBy: { performedAt: "desc" },
    });
  });

  ipcMain.handle(
    "patientHistory:create",
    async (_e, { data }: { data: { patientId: string; title: string; notes?: string | null; performedAt?: string | Date | null } }) => {
      const prisma = getPrisma();
      if (!data?.patientId) throw new Error("PATIENT_ID_REQUIRED");
      if (!data?.title || !data.title.trim()) throw new Error("TITLE_REQUIRED");
      return prisma.patientTreatmentHistory.create({
        data: {
          patientId: data.patientId,
          title: data.title.trim(),
          notes: data.notes?.trim() || null,
          performedAt: data.performedAt ? new Date(data.performedAt as any) : undefined,
        },
      });
    }
  );

  ipcMain.handle(
    "patientHistory:update",
    async (_e, { id, data }: { id: string; data: any }) => {
      const prisma = getPrisma();
      if (!id) throw new Error("ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");
      return prisma.patientTreatmentHistory.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: String(data.title).trim() } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ? String(data.notes).trim() : null } : {}),
          ...(data.performedAt !== undefined ? { performedAt: data.performedAt ? new Date(data.performedAt as any) : undefined } : {}),
        },
      });
    }
  );

  ipcMain.handle("patientHistory:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    if (!id) throw new Error("ID_REQUIRED");
    return prisma.patientTreatmentHistory.delete({ where: { id } });
  });
}
