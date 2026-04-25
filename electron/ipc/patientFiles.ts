import { app, dialog, ipcMain, nativeImage, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getPrisma } from "../db";

// Phase 3C.2: Patient files with categories + tags + archive + thumbnails

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const ALLOWED_EXT = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".bmp",
  ".gif",
  ".doc",
  ".docx",
]);

type PatientFileCategory = "PHOTO" | "SCAN" | "LAB" | "OTHER";

type ListFilters = {
  q?: string;
  category?: "ALL" | PatientFileCategory;
  includeArchived?: boolean;
  sort?: "uploadedAt_desc" | "uploadedAt_asc" | "name_asc" | "name_desc";
};

type ThumbResponse = {
  dataUrl: string | null;
  width?: number;
  height?: number;
  error?: string;
};

const THUMB_MAX_W = 220;
const THUMB_MAX_H = 160;

// Simple in-memory cache: id -> { mtimeMs, dataUrl }
const thumbCache = new Map<string, { mtimeMs: number; dataUrl: string }>();

function mimeFromExt(ext: string) {
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".bmp":
      return "image/bmp";
    case ".gif":
      return "image/gif";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function defaultCategoryFromMime(mimeType: string, ext: string): PatientFileCategory {
  if (mimeType.startsWith("image/")) return "PHOTO";
  if (ext === ".pdf") return "SCAN";
  return "OTHER";
}

function assertNonEmpty(v: any, code: string) {
  if (!v || !String(v).trim()) throw new Error(code);
}

function assertCategory(c: any): asserts c is PatientFileCategory {
  if (c !== "PHOTO" && c !== "SCAN" && c !== "CONSENT" && c !== "LAB" && c !== "OTHER") {
    throw new Error("INVALID_CATEGORY");
  }
}

function safeFileName(name: string) {
  return name.replace(/[\/]/g, "_").replace(/[^a-zA-Z0-9._ -]/g, "_");
}

function patientUploadDir(patientId: string) {
  return path.join(app.getPath("userData"), "uploads", "patients", patientId);
}

async function makeThumbnailDataUrl(storedPath: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  // nativeImage supports PNG/JPEG best. For other formats it may return empty.
  const img = nativeImage.createFromPath(storedPath);
  if (img.isEmpty()) return null;

  const resized = img.resize({ width: THUMB_MAX_W, height: THUMB_MAX_H, quality: "good" });
  const size = resized.getSize();
  const dataUrl = resized.toDataURL();
  return { dataUrl, width: size.width, height: size.height };
}

export function registerPatientFilesIpc() {
  ipcMain.handle(
    "patientFiles:listByPatient",
    async (_e, { patientId, filters }: { patientId: string; filters?: ListFilters }) => {
      const prisma = getPrisma();
      assertNonEmpty(patientId, "PATIENT_ID_REQUIRED");

      const f = filters ?? {};
      const q = (f.q ?? "").trim();
      const includeArchived = !!f.includeArchived;
      const category = f.category ?? "ALL";
      const sort = f.sort ?? "uploadedAt_desc";

      const where: any = {
        patientId,
        ...(includeArchived ? {} : { isArchived: false }),
      };

      if (category !== "ALL") {
        assertCategory(category);
        where.category = category;
      }

      if (q) {
        where.OR = [
          { originalName: { contains: q } },
          { caption: { contains: q } },
          { tags: { contains: q } },
        ];
      }

      let orderBy: any = { uploadedAt: "desc" };
      if (sort === "uploadedAt_asc") orderBy = { uploadedAt: "asc" };
      if (sort === "name_asc") orderBy = { originalName: "asc" };
      if (sort === "name_desc") orderBy = { originalName: "desc" };

      return prisma.patientFile.findMany({ where, orderBy });
    }
  );

  ipcMain.handle(
    "patientFiles:pickAndUpload",
    async (
      _e,
      {
        patientId,
        caption,
        category,
        tags,
      }: {
        patientId: string;
        caption?: string | null;
        category?: PatientFileCategory | null;
        tags?: string | null;
      }
    ) => {
      const prisma = getPrisma();
      assertNonEmpty(patientId, "PATIENT_ID_REQUIRED");

      const res = await dialog.showOpenDialog({
        title: "Selecteer bestand",
        properties: ["openFile"],
        filters: [
          {
            name: "Toegestane bestanden",
            extensions: Array.from(ALLOWED_EXT).map((x) => x.replace(/^\./, "")),
          },
        ],
      });

      if (res.canceled || res.filePaths.length === 0) return null;

      const sourcePath = res.filePaths[0];
      const stat = await fs.promises.stat(sourcePath);
      if (stat.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE_MAX_25MB");

      const originalName = path.basename(sourcePath);
      const ext = path.extname(originalName).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) throw new Error("FILE_TYPE_NOT_ALLOWED");

      const mimeType = mimeFromExt(ext);
      const uploadDir = patientUploadDir(patientId);
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rand = crypto.randomBytes(6).toString("hex");
      const storedName = `${stamp}_${rand}_${safeFileName(originalName)}`;
      const storedPath = path.join(uploadDir, storedName);

      await fs.promises.copyFile(sourcePath, storedPath);

      let cat: PatientFileCategory = defaultCategoryFromMime(mimeType, ext);
      if (category) {
        assertCategory(category);
        cat = category;
      }

      const row = await prisma.patientFile.create({
        data: {
          patientId,
          originalName,
          storedName,
          storedPath,
          mimeType,
          size: stat.size,
          caption: caption?.trim() || null,
          category: cat,
          tags: tags?.trim() || null,
          isArchived: false,
        },
      });

      // clear any existing cache key (defensive)
      thumbCache.delete(row.id);

      return row;
    }
  );

  ipcMain.handle(
    "patientFiles:update",
    async (
      _e,
      {
        id,
        data,
      }: {
        id: string;
        data: { caption?: string | null; category?: PatientFileCategory; tags?: string | null; isArchived?: boolean };
      }
    ) => {
      const prisma = getPrisma();
      assertNonEmpty(id, "ID_REQUIRED");
      if (!data) throw new Error("INVALID_INPUT");

      if (data.category !== undefined) assertCategory(data.category);

      const updated = await prisma.patientFile.update({
        where: { id },
        data: {
          ...(data.caption !== undefined ? { caption: data.caption ? String(data.caption).trim() : null } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.tags !== undefined ? { tags: data.tags ? String(data.tags).trim() : null } : {}),
          ...(data.isArchived !== undefined ? { isArchived: !!data.isArchived } : {}),
        },
      });

      return updated;
    }
  );

  ipcMain.handle("patientFiles:remove", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");

    const existing = await prisma.patientFile.findUnique({ where: { id } });
    if (!existing) return true;

    await prisma.patientFile.delete({ where: { id } });
    thumbCache.delete(id);

    try {
      await fs.promises.unlink(existing.storedPath);
    } catch {
      // ignore
    }

    return true;
  });

  ipcMain.handle("patientFiles:open", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");
    const existing = await prisma.patientFile.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");
    await shell.openPath(existing.storedPath);
    return true;
  });

  ipcMain.handle("patientFiles:reveal", async (_e, { id }: { id: string }) => {
    const prisma = getPrisma();
    assertNonEmpty(id, "ID_REQUIRED");
    const existing = await prisma.patientFile.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");
    shell.showItemInFolder(existing.storedPath);
    return true;
  });

  // NEW: Thumbnail (data URL) for images
  ipcMain.handle(
    "patientFiles:getThumbnail",
    async (_e, { id }: { id: string }): Promise<ThumbResponse> => {
      const prisma = getPrisma();
      assertNonEmpty(id, "ID_REQUIRED");

      const existing = await prisma.patientFile.findUnique({ where: { id } });
      if (!existing) return { dataUrl: null, error: "NOT_FOUND" };

      // Only try for images
      if (!String(existing.mimeType || "").startsWith("image/")) {
        return { dataUrl: null };
      }

      try {
        const stat = await fs.promises.stat(existing.storedPath);
        const cached = thumbCache.get(id);
        if (cached && cached.mtimeMs === stat.mtimeMs) {
          return { dataUrl: cached.dataUrl };
        }

        const thumb = await makeThumbnailDataUrl(existing.storedPath);
        if (!thumb) return { dataUrl: null, error: "THUMBNAIL_UNSUPPORTED_FORMAT" };

        thumbCache.set(id, { mtimeMs: stat.mtimeMs, dataUrl: thumb.dataUrl });
        return { dataUrl: thumb.dataUrl, width: thumb.width, height: thumb.height };
      } catch (e: any) {
        return { dataUrl: null, error: e?.message ?? "THUMBNAIL_FAILED" };
      }
    }
  );
}
