import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import Database from "better-sqlite3";
import { initializeSchema } from "./schema.js";

// ─── Database Manager ───────────────────────────────────────────────────────

export interface DatabaseManager {
  workspace: Database.Database;
  global: Database.Database;
  close(): void;
}

const GLOBAL_DIR = path.join(os.homedir(), ".local-agent-context");
const GLOBAL_DB_PATH = path.join(GLOBAL_DIR, "global.db");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function openDatabase(dbPath: string): Database.Database {
  ensureDir(path.dirname(dbPath));
  const db = new Database(dbPath);
  initializeSchema(db);
  return db;
}

export function createDatabaseManager(workspacePath: string): DatabaseManager {
  const workspaceDbDir = path.join(workspacePath, ".agent-context");
  const workspaceDbPath = path.join(workspaceDbDir, "memory.db");

  const workspace = openDatabase(workspaceDbPath);
  const global = openDatabase(GLOBAL_DB_PATH);

  return {
    workspace,
    global,
    close() {
      workspace.close();
      global.close();
    },
  };
}

export function getDb(manager: DatabaseManager, scope: "workspace" | "global"): Database.Database {
  return scope === "global" ? manager.global : manager.workspace;
}
