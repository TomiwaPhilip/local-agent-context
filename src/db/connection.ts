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
// Lazily opens and caches database connections. Workspace DBs are keyed by
// name and stored centrally at ~/.local-agent-context/workspaces/<name>/.
// Agents pass the workspace name (from the IDE) or a path (basename is used).

const BASE_DIR = path.join(os.homedir(), ".local-agent-context");
const GLOBAL_DB_PATH = path.join(BASE_DIR, "global.db");
const WORKSPACES_DIR = path.join(BASE_DIR, "workspaces");

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

/**
 * Resolve a workspace identifier (name or path) to a consistent name.
 * - "/Users/admin/projects/my-app" → "my-app"
 * - "my-app" → "my-app"
 * - "C:\\Users\\dev\\my-app" → "my-app"
 */
function resolveWorkspaceName(workspace: string): string {
  const trimmed = workspace.trim();
  // Looks like an absolute path — extract basename
  if (path.isAbsolute(trimmed)) {
    return path.basename(trimmed);
  }
  // Already a name — sanitize it (remove path separators, keep it filesystem-safe)
  return trimmed.replace(/[/\\:*?"<>|]/g, "-");
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

  private getWorkspaceDb(workspace: string): Database.Database {
    const name = resolveWorkspaceName(workspace);
    let db = this.workspaceDbs.get(name);
    if (!db) {
      const dbPath = path.join(WORKSPACES_DIR, name, "memory.db");
      db = openDatabase(dbPath);
      this.workspaceDbs.set(name, db);
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
   * @param workspace — workspace name or path from the tool args.
   * Falls back to the default workspace (from --workspace CLI), then to a null DB.
   */
  getManager(workspace?: string): DatabaseManager {
    const ws = workspace ?? this.defaultWorkspace;
    const hasWorkspace = !!ws;
    const wsDb = ws ? this.getWorkspaceDb(ws) : this.getNullDb();

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
