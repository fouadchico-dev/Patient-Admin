import { ipcMain } from "electron";
import { getPrisma } from "../db";

export type NoteType = "GENERAL" | "CONSULT" | "PROGRESS" | "INTERNAL";

type CreateInput = {
  patientId: string;
  type: NoteType;
  content: string;
  // optional link
  appointmentId?: string | null;
  // backwards compatible timestamps
  notedAt?: string | null;
};

type UpdateInput = {
  type?: NoteType;
  content?: string;
  appointmentId?: string | null;
  notedAt?: string | null;
};

function assertNonEmpty(v: any, code: string) {
  if (!v || !String(v).trim()) throw new Error(code);
}

function assertType(t: any): asserts t is NoteType {
  if (t !== "GENERAL" && t !== "CONSULT" && t !== "PROGRESS" && t !== "INTERNAL") {
    throw new Error("INVALID_NOTE_TYPE");
  }
}

function isoToDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function registerPatientNotesIpc() {
  ipcMain.handle("patientNotes:listByPatient", async (_e, { patientId }: { patientId: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(patientId, "PATIENT_ID_REQUIRED");
    return prisma.patientTreatmentNotities.findMany({
      where: { patientId },
      orderBy: { notedAt: "desc" },
    });
  });

  ipcMain.handle(
    "patientNotes:listByAppointment",
    async (_e, { appointmentId }: { appointmentId: string }) => {
      const prisma = getPrisma();
      assertNonEmpty(appointmentId, "APPOINTMENT_ID_REQUIRED");
      return prisma.patientTreatmentNotities.findMany({
        where: { appointmentId },
        orderBy: { notedAt: "desc" },
      });
    }
  );

  ipcMain.handle("patientNotes:create", async (_e, { data }: { data: CreateInput }) => {
    const prisma = getPrisma();
    if (!data) throw new Error("INVALID_INPUT");
    assertNonEmpty(data.patientId, "PATIENT_ID_REQUIRED");
    assertType(data.type);
    assertNonEmpty(data.content, "CONTENT_REQUIRED");

    // backward compatible: accept notedAt or performedAt
    const when = isoToDate(data.notedAt) ?? new Date();

    // optional safety: if appointmentId provided, verify it belongs to the same patient
    if (data.appointmentId) {
      const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
      if (!appt || appt.patientId !== data.patientId) {
        throw new Error("INVALID_APPOINTMENT_LINK");
      }
    }

    return prisma.patientTreatmentNotities.create({
      data: {
        patientId: data.patientId,
        appointmentId: data.appointmentId ?? null,
        title: data.type,
        content: data.content.trim(),
        notedAt: when,
      },
    });
  });

  ipcMain.handle("patientNotes:update", async (_e, { id, data }: { id: string; data: UpdateInput }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");
    if (!data) throw new Error("INVALID_INPUT");
    if (data.type !== undefined) assertType(data.type);

    const when =
      isoToDate(data.notedAt) ??  undefined;

    // optional safety on appointment link change
    if (data.appointmentId !== undefined && data.appointmentId) {
      const cur = await prisma.patientTreatmentNotities.findUnique({ where: { id } });
      if (cur) {
        const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
        if (!appt || appt.patientId !== cur.patientId) {
          throw new Error("INVALID_APPOINTMENT_LINK");
        }
      }
    }

    return prisma.patientTreatmentNotities.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { title: data.type } : {}),
        ...(data.content !== undefined ? { content: data.content ? String(data.content).trim() : null } : {}),
        ...(data.appointmentId !== undefined ? { appointmentId: data.appointmentId ?? null } : {}),
        ...(when !== undefined ? { notedAt: when } : {}),
      },
    });
  });

  ipcMain.handle("patientNotes:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");
    return prisma.patientTreatmentNotities.delete({ where: { id } });
  });
}
