import { ipcMain } from "electron";
import { getPrisma } from "../db";

// CRUD for Staff (DOCTOR/ASSISTANT) in the simplified model (no link to User)
// Expected schema:
// enum StaffRole { DOCTOR ASSISTANT }
// model Staff { role StaffRole, firstName, lastName, email?, phone?, notes?, active }

type StaffRole = "DOCTOR" | "ASSISTANT";

type StaffCreateInput = {
  role: StaffRole;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean;
};

type StaffUpdateInput = Partial<StaffCreateInput>;

function assertRole(role: any): asserts role is StaffRole {
  if (role !== "DOCTOR" && role !== "ASSISTANT") {
    throw new Error("INVALID_STAFF_ROLE");
  }
}

function assertNonEmpty(v: any, code: string) {
  if (!v || !String(v).trim()) throw new Error(code);
}

export function registerStaffIpc() {
  // List
  ipcMain.handle("staff:list", async (_e, { q }: { q?: string }) => {
    const prisma = getPrisma();
    const query = (q ?? "").trim();

    return prisma.staff.findMany({
      where: query
        ? {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  });

  // Create
  ipcMain.handle("staff:create", async (_e, { data }: { data: StaffCreateInput }) => {
    const prisma = getPrisma();

    if (!data) throw new Error("INVALID_INPUT");
    assertRole((data as any).role);
    assertNonEmpty(data.firstName, "FIRSTNAME_REQUIRED");
    assertNonEmpty(data.lastName, "LASTNAME_REQUIRED");

    return prisma.staff.create({
      data: {
        role: data.role,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
        active: data.active ?? true,
      },
    });
  });

  // Update
  ipcMain.handle(
    "staff:update",
    async (_e, { id, data }: { id: string; data: StaffUpdateInput }) => {
      const prisma = getPrisma();
      assertNonEmpty(id, "ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");
      if ((data as any).role) assertRole((data as any).role);

      return prisma.staff.update({
        where: { id },
        data: {
          ...(data.role ? { role: data.role } : {}),
          ...(data.firstName !== undefined ? { firstName: String(data.firstName).trim() } : {}),
          ...(data.lastName !== undefined ? { lastName: String(data.lastName).trim() } : {}),
          ...(data.email !== undefined ? { email: data.email ? String(data.email).trim() : null } : {}),
          ...(data.phone !== undefined ? { phone: data.phone ? String(data.phone).trim() : null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ? String(data.notes).trim() : null } : {}),
          ...(data.active !== undefined ? { active: !!data.active } : {}),
        },
      });
    }
  );

  // Remove (soft deactivate)
  ipcMain.handle("staff:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");

    return prisma.staff.update({
      where: { id },
      data: { active: false },
    });
  });
}