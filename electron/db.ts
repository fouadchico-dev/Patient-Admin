import * as path from "node:path";
//import { app } from "electron";
import { app } from "electron";

//import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3  } from "@prisma/adapter-better-sqlite3";



let prisma: PrismaClient | null = null;


function resolveDbPath() {
  const fileName = "patientadmin.db";

  // In packaged/prod: userData is de juiste plek (schrijfbaar & persistent)
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), fileName);
  }

  // In dev: db in prisma folder (makkelijk te beheren in repo)
  return path.resolve("prisma", fileName);
}



export function getPrisma(): PrismaClient {
  if (prisma) return prisma;

  
  const dbPath = resolveDbPath();
  console.log("[DB] using", dbPath, "packaged?", app.isPackaged);

  //const dbPath = path.join(app.getPath("userData"), "app.db");
  //const dbPath = path.resolve("prisma/patientadmin.db");

  // SQLite connection
  //const sqlite = new Database(dbPath);

  // Prisma 7 adapter (REQUIRED)
  //const adapter = new PrismaBetterSqlite3({url : "file"});

    const adapter = new PrismaBetterSqlite3({
        url: `file:${dbPath}`, // ✅ REQUIRED
    });

  prisma = new PrismaClient({
    adapter, // ✅ THIS IS THE KEY
  });

  return prisma;
}
