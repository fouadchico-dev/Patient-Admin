import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureDefaultAdmin } from "./bootstrap";

import { registerAllIpc } from "./ipc";

// ✅ ESM-safe paths (NO __dirname ANYWHERE)
const MAIN_FILE = fileURLToPath(import.meta.url);
const MAIN_DIR = path.dirname(MAIN_FILE);

// ✅ App root = parent of dist-electron
const APP_ROOT = path.resolve(MAIN_DIR, "..");

// electron-vite envs
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const RENDERER_DIST = path.join(APP_ROOT, "dist");
export const ELECTRON_DIST = path.join(APP_ROOT, "dist-electron");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null = null;

function createWindow() {
  // ✅ preload must be resolved via import.meta.url
  const preloadPath = fileURLToPath(
    new URL("./preload.mjs", import.meta.url)
  );

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    webPreferences: {
      preload: preloadPath,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


app.whenReady().then(async () => {

  
  console.log("App name:", app.getName());
  console.log("userData:", app.getPath("userData"));
  console.log("DB path:", path.join(app.getPath("userData"), "patientadmin.db"));

   // 1) Eerst bootstrap (seed/ensure admin/roles/staff links)
   await ensureDefaultAdmin();   // ✅ seed via Electron runtime

  /*
  registerAuthIpc();
  registerDoctorsIpc();
  registerProjectsIpc();
  registerTreatmentsIpc();
  registerPatientsIpc();
  */

  // 2) Dan pas IPC handlers registre
  registerAllIpc();
  
 
  // 3) Dan window maken
  createWindow();
});
