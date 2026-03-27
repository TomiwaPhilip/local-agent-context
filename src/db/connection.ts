import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import Database from "better-sqlite3";
import { initializeSchema } from "./schema.js";

// ─── Database Manager ───────────────────────────────────────────────────────
// The per-call interface that tools work with. Created dynamically from the pool.

export interface DatabaseManager {
  workspace: Database.Database;
  global: Database.Database;
  hasWorkspace: boolean;
  close(): void;
}

// ─── Connection Pool ────────────────────────────────────────────────────────
// Lazily opens and caches database connections. Workspace DBs are opened on
// demand when an agent passes a workspace path in a tool call.

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

export class ConnectionPool {
  private globalDb: Database.Database;
  private workspaceDbs = new Map<string, Database.Database>();
  private nullDb?: Database.Database;
  private defaultWorkspace?: string;

  constructor(defaultWorkspace?: string) {
    this.globalDb = openDatabase(GLOBAL_DB_PATH);
    this.defaultWorkspace = defaultWorkspace;

    // If a default workspace is provided, eagerly open it
    if (defaultWorkspace) {
      this.getWorkspaceDb(defaultWorkspace);
    }
  }

  private getWorkspaceDb(workspacePath: string): Database.Database {
    const resolved = path.resolve(workspacePath);
    let db = this.workspaceDbs.get(resolved);
    if (!db) {
      const dbPath = path.join(resolved, ".agent-context", "memory.db");
      db = openDatabase(dbPath);
      this.workspaceDbs.set(resolved, db);
    }
    return db;
  }

  /** In-memory fallback when no workspace is provided — queries return empty. */
  private getNullDb(): Database.Database {
    if (!this.nullDb) {
      this.nullDb = new Database(":memory:");
      initializeSchema(this.nullDb);
    }
    return this.nullDb;
  }

  /**
   * Build a DatabaseManager for a single tool call.
   * @param workspace — explicit workspace path from the tool args
   * Falls back to the default workspace (from --workspace CLI), then to a null DB.
   */
  getManager(workspace?: string): DatabaseManager {
    const wsPath = workspace ?? this.defaultWorkspace;
    const hasWorkspace = !!wsPath;
    const wsDb = wsPath ? this.getWorkspaceDb(wsPath) : this.getNullDb();

    return {
      workspace: wsDb,
      global: this.globalDb,
      hasWorkspace,
      close() { /* pool manages lifecycle */ },
    };
  }

  close(): void {
    this.globalDb.close();
    for (const db of this.workspaceDbs.values()) db.close();
    this.nullDb?.close();
  }
}

export function getDb(manager: DatabaseManager, scope: "workspace" | "global"): Database.Database {
  return scope === "global" ? manager.global : manager.workspace;
}
