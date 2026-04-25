import { ipcMain } from "electron";
import bcrypt from "bcryptjs";
import { getPrisma } from "../db";

// Users CRUD for simplified model
// User has: username, passwordHash, role (USER|MANAGER|ADMIN), active

type UserRole = "USER" | "MANAGER" | "ADMIN";

type CreateUserInput = {
  username: string;
  password: string;
  role: UserRole;
  active?: boolean;
};

type UpdateUserInput = {
  username?: string;
  role?: UserRole;
  active?: boolean;
  password?: string; // optional reset
};

function assertRole(role: any): asserts role is UserRole {
  if (role !== "USER" && role !== "MANAGER" && role !== "ADMIN") {
    throw new Error("INVALID_USER_ROLE");
  }
}

function assertNonEmpty(v: any, code: string) {
  if (!v || !String(v).trim()) throw new Error(code);
}

export function registerUsersIpc() {
  ipcMain.handle("users:list", async (_e, { q }: { q?: string }) => {
    const prisma = getPrisma();
    const query = (q ?? "").trim();

    return prisma.user.findMany({
      where: query
        ? {
            OR: [
              { username: { contains: query } },
            ],
          }
        : undefined,
      orderBy: [{ username: "asc" }],
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  ipcMain.handle("users:create", async (_e, { data }: { data: CreateUserInput }) => {
    const prisma = getPrisma();

    if (!data) throw new Error("INVALID_INPUT");
    assertNonEmpty(data.username, "USERNAME_REQUIRED");
    assertNonEmpty(data.password, "PASSWORD_REQUIRED");
    assertRole((data as any).role);

    const username = data.username.trim();

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) throw new Error("USERNAME_ALREADY_EXISTS");

    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        username,
        passwordHash,
        role: data.role,
        active: data.active ?? true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  ipcMain.handle("users:update", async (_e, { id, data }: { id: string; data: UpdateUserInput }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");
    if (!data) throw new Error("INVALID_INPUT");

    const updateData: any = {};

    if (data.username !== undefined) {
      const username = String(data.username).trim();
      assertNonEmpty(username, "USERNAME_REQUIRED");

      // ensure unique
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== id) throw new Error("USERNAME_ALREADY_EXISTS");

      updateData.username = username;
    }

    if (data.role !== undefined) {
      assertRole(data.role);
      updateData.role = data.role;
    }

    if (data.active !== undefined) {
      updateData.active = !!data.active;
    }

    if (data.password !== undefined) {
      const pw = String(data.password);
      assertNonEmpty(pw, "PASSWORD_REQUIRED");
      updateData.passwordHash = await bcrypt.hash(pw, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  // Soft deactivate (preferred)
  ipcMain.handle("users:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");

    return prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
}
