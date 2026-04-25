import { ipcMain } from "electron";
import { getPrisma } from "../db";

type ContactType = "GUARDIAN" | "EMERGENCY";

type ContactCreateInput = {
  patientId: string;
  type: ContactType;
  name: string;
  relation?: string | null;
  phone: string;
  email?: string | null;
  notes?: string | null;
};

type ContactUpdateInput = Partial<Omit<ContactCreateInput, "patientId">>;

function assertNonEmpty(v: any, code: string) {
  if (!v || !String(v).trim()) throw new Error(code);
}

function assertType(t: any): asserts t is ContactType {
  if (t !== "GUARDIAN" && t !== "EMERGENCY") throw new Error("INVALID_CONTACT_TYPE");
}

export function registerPatientContactsIpc() {
  ipcMain.handle(
    "patientContacts:listByPatient",
    async (_e, { patientId }: { patientId: string }) => {
      const prisma = getPrisma();
      assertNonEmpty(patientId, "PATIENT_ID_REQUIRED");
      return prisma.patientContact.findMany({
        where: { patientId },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
    }
  );

  ipcMain.handle(
    "patientContacts:create",
    async (_e, { data }: { data: ContactCreateInput }) => {
      const prisma = getPrisma();
      if (!data) throw new Error("INVALID_INPUT");
      assertNonEmpty(data.patientId, "PATIENT_ID_REQUIRED");
      assertType((data as any).type);
      assertNonEmpty(data.name, "NAME_REQUIRED");
      assertNonEmpty(data.phone, "PHONE_REQUIRED");

      return prisma.patientContact.create({
        data: {
          patientId: data.patientId,
          type: data.type,
          name: data.name.trim(),
          relation: data.relation?.trim() || null,
          phone: data.phone.trim(),
          email: data.email?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      });
    }
  );

  ipcMain.handle(
    "patientContacts:update",
    async (_e, { id, data }: { id: string; data: ContactUpdateInput }) => {
      const prisma = getPrisma();
      assertNonEmpty(id, "ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");
      if ((data as any).type !== undefined) assertType((data as any).type);

      // optional required checks if provided
      if (data.name !== undefined) assertNonEmpty(data.name, "NAME_REQUIRED");
      if (data.phone !== undefined) assertNonEmpty(data.phone, "PHONE_REQUIRED");

      return prisma.patientContact.update({
        where: { id },
        data: {
          ...(data.type !== undefined ? { type: data.type as any } : {}),
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.relation !== undefined ? { relation: data.relation ? String(data.relation).trim() : null } : {}),
          ...(data.phone !== undefined ? { phone: String(data.phone).trim() } : {}),
          ...(data.email !== undefined ? { email: data.email ? String(data.email).trim() : null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ? String(data.notes).trim() : null } : {}),
        },
      });
    }
  );

  ipcMain.handle("patientContacts:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");
    return prisma.patientContact.delete({ where: { id } });
  });
}
