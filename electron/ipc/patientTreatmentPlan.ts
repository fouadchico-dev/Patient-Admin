import { ipcMain } from "electron";
import { getPrisma } from "../db";

type TreatmentStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

type CreateInput = {
  patientId: string;
  title: string;
  plannedDate?: string | null;
  notes?: string | null;
};

type UpdateInput = {
  title?: string;
  status?: TreatmentStatus;
  plannedDate?: string | null;
  notes?: string | null;
};

function assertNonEmpty(v: any, code: string) {
  if (!v || !String(v).trim()) throw new Error(code);
}

function assertStatus(s: any): asserts s is TreatmentStatus {
  if (s !== "OPEN" && s !== "IN_PROGRESS" && s !== "DONE" && s !== "CANCELLED") {
    throw new Error("INVALID_STATUS");
  }
}

export function registerPatientTreatmentPlanIpc() {
  ipcMain.handle(
    "patientTreatmentPlan:listByPatient",
    async (_e, { patientId }: { patientId: string }) => {
      const prisma = getPrisma();
      assertNonEmpty(patientId, "PATIENT_ID_REQUIRED");
      
        return prisma.patientTreatmentPlanItem.findMany({
        where: { patientId },
        orderBy: { createdAt: "asc" },
        include: {
            appointments: {
            orderBy: { start: "asc" },
            include: { staff: true},
            },
        },
        });

    }
  );

  ipcMain.handle(
    "patientTreatmentPlan:create",
    async (_e, { data }: { data: CreateInput }) => {
      const prisma = getPrisma();
      if (!data) throw new Error("INVALID_INPUT");
      assertNonEmpty(data.patientId, "PATIENT_ID_REQUIRED");
      assertNonEmpty(data.title, "TITLE_REQUIRED");

      return prisma.patientTreatmentPlanItem.create({
        data: {
          patientId: data.patientId,
          title: data.title.trim(),
          plannedDate: data.plannedDate ? new Date(data.plannedDate) : null,
          notes: data.notes?.trim() || null,
        },
      });
    }
  );

  ipcMain.handle(
    "patientTreatmentPlan:update",
    async (_e, { id, data }: { id: string; data: UpdateInput }) => {
      const prisma = getPrisma();
      assertNonEmpty(id, "ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");
      if (data.status !== undefined) assertStatus(data.status);

      return prisma.patientTreatmentPlanItem.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: String(data.title).trim() } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.plannedDate !== undefined ? { plannedDate: data.plannedDate ? new Date(data.plannedDate) : null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ? String(data.notes).trim() : null } : {}),
        },
      });
    }
  );

  ipcMain.handle(
    "patientTreatmentPlan:remove",
    async (_e, { id }: { id: string }) => {
      const prisma = getPrisma();
      assertNonEmpty(id, "ID_REQUIRED");
      return prisma.patientTreatmentPlanItem.delete({ where: { id } });
    }
  );
}
