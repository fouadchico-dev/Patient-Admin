import { ipcMain } from "electron";
import { getPrisma } from "../db";

export function registerPatientDiagnosesIpc() {
  ipcMain.handle("patientDiagnoses:listByPatient", async (_e, { patientId }: { patientId: string }) => {
    const prisma = getPrisma();
    if (!patientId) throw new Error("PATIENT_ID_REQUIRED");
    return prisma.patientDiagnosis.findMany({
      where: { patientId },
      orderBy: { diagnosedAt: "desc" },
    });
  });

  ipcMain.handle(
    "patientDiagnoses:create",
    async (_e, { data }: { data: { patientId: string; name: string; code?: string | null; notes?: string | null; diagnosedAt?: string | Date | null } }) => {
      const prisma = getPrisma();
      if (!data?.patientId) throw new Error("PATIENT_ID_REQUIRED");
      if (!data?.name || !data.name.trim()) throw new Error("NAME_REQUIRED");
      return prisma.patientDiagnosis.create({
        data: {
          patientId: data.patientId,
          name: data.name.trim(),
          code: data.code?.trim() || null,
          notes: data.notes?.trim() || null,
          diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt as any) : undefined,
        },
      });
    }
  );

  ipcMain.handle(
    "patientDiagnoses:update",
    async (_e, { id, data }: { id: string; data: { name?: string; code?: string | null; notes?: string | null; diagnosedAt?: string | Date | null } }) => {
      const prisma = getPrisma();
      if (!id) throw new Error("ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");
      return prisma.patientDiagnosis.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.code !== undefined ? { code: data.code ? String(data.code).trim() : null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ? String(data.notes).trim() : null } : {}),
          ...(data.diagnosedAt !== undefined ? { diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt as any) : undefined } : {}),
        },
      });
    }
  );

  ipcMain.handle("patientDiagnoses:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    if (!id) throw new Error("ID_REQUIRED");
    return prisma.patientDiagnosis.delete({ where: { id } });
  });
}
