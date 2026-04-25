import { ipcMain } from "electron";
import { getPrisma } from "../db";

export function registerPatientMedicationsIpc() {
  ipcMain.handle("patientMedications:listByPatient", async (_e, { patientId }: { patientId: string }) => {
    const prisma = getPrisma();
    if (!patientId) throw new Error("PATIENT_ID_REQUIRED");
    return prisma.patientMedication.findMany({
      where: { patientId },
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
    });
  });

  ipcMain.handle(
    "patientMedications:create",
    async (_e, { data }: { data: { patientId: string; name: string; dosage?: string | null; frequency?: string | null; notes?: string | null; startDate?: string | Date | null; endDate?: string | Date | null } }) => {
      const prisma = getPrisma();
      if (!data?.patientId) throw new Error("PATIENT_ID_REQUIRED");
      if (!data?.name || !data.name.trim()) throw new Error("NAME_REQUIRED");
      return prisma.patientMedication.create({
        data: {
          patientId: data.patientId,
          name: data.name.trim(),
          dosage: data.dosage?.trim() || null,
          frequency: data.frequency?.trim() || null,
          notes: data.notes?.trim() || null,
          startDate: data.startDate ? new Date(data.startDate as any) : null,
          endDate: data.endDate ? new Date(data.endDate as any) : null,
        },
      });
    }
  );

  ipcMain.handle(
    "patientMedications:update",
    async (_e, { id, data }: { id: string; data: any }) => {
      const prisma = getPrisma();
      if (!id) throw new Error("ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");
      return prisma.patientMedication.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.dosage !== undefined ? { dosage: data.dosage ? String(data.dosage).trim() : null } : {}),
          ...(data.frequency !== undefined ? { frequency: data.frequency ? String(data.frequency).trim() : null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ? String(data.notes).trim() : null } : {}),
          ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate as any) : null } : {}),
          ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate as any) : null } : {}),
        },
      });
    }
  );

  ipcMain.handle("patientMedications:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    if (!id) throw new Error("ID_REQUIRED");
    return prisma.patientMedication.delete({ where: { id } });
  });
}
