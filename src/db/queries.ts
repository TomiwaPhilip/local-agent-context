import Database from "better-sqlite3";
import type { DatabaseManager } from "./connection.js";
import { getDb } from "./connection.js";
import type { MemoryRow, MemoryScope, MemoryStatus, MemoryType, SessionRow } from "../types.js";

// ─── Memory Queries ─────────────────────────────────────────────────────────

export function insertMemory(
  manager: DatabaseManager,
  memory: MemoryRow,
): void {
  const db = getDb(manager, memory.scope as "workspace" | "global");
  db.prepare(`
    INSERT INTO memories (id, scope, type, title, content, tags, importance, status, created_at, updated_at, session_id)
    VALUES (@id, @scope, @type, @title, @content, @tags, @importance, @status, @created_at, @updated_at, @session_id)
  `).run(memory);
}

export function getMemoryById(
  manager: DatabaseManager,
  id: string,
): MemoryRow | undefined {
  // Search both databases
  const wsResult = manager.workspace.prepare("SELECT * FROM memories WHERE id = ?").get(id) as MemoryRow | undefined;
  if (wsResult) return wsResult;
  return manager.global.prepare("SELECT * FROM memories WHERE id = ?").get(id) as MemoryRow | undefined;
}

export function updateMemory(
  manager: DatabaseManager,
  id: string,
  updates: Partial<Pick<MemoryRow, "title" | "content" | "tags" | "importance" | "status" | "type">>,
): boolean {
  const existing = getMemoryById(manager, id);
  if (!existing) return false;

  const db = getDb(manager, existing.scope as "workspace" | "global");
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (fields.length === 0) return false;

  fields.push("updated_at = @updated_at");
  values.updated_at = new Date().toISOString();

  const result = db.prepare(`UPDATE memories SET ${fields.join(", ")} WHERE id = @id`).run(values);
  return result.changes > 0;
}

export function deleteMemory(
  manager: DatabaseManager,
  id: string,
  hard: boolean,
): boolean {
  const existing = getMemoryById(manager, id);
  if (!existing) return false;

  const db = getDb(manager, existing.scope as "workspace" | "global");

  if (hard) {
    const result = db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    return result.changes > 0;
  } else {
    const now = new Date().toISOString();
    const result = db.prepare("UPDATE memories SET status = 'archived', updated_at = ? WHERE id = ?").run(now, id);
    return result.changes > 0;
  }
}

export function searchMemories(
  manager: DatabaseManager,
  query: string,
  filters: {
    type?: MemoryType;
    tags?: string[];
    scope?: MemoryScope;
    status?: MemoryStatus;
    limit?: number;
  },
): MemoryRow[] {
  const limit = filters.limit ?? 10;
  const status = filters.status ?? "active";

  function searchDb(db: Database.Database, dbScope: string): MemoryRow[] {
    if (filters.scope && filters.scope !== dbScope) return [];

    // Use FTS5 MATCH for search
    let sql = `
      SELECT m.* FROM memories m
      JOIN memories_fts fts ON m.rowid = fts.rowid
      WHERE memories_fts MATCH @query
        AND m.status = @status
    `;
    const params: Record<string, unknown> = { query, status };

    if (filters.type) {
      sql += " AND m.type = @type";
      params.type = filters.type;
    }

    if (filters.tags && filters.tags.length > 0) {
      // Match any tag using JSON
      const tagConditions = filters.tags.map((_, i) => {
        const key = `tag${i}`;
        params[key] = `%${filters.tags![i]}%`;
        return `m.tags LIKE @${key}`;
      });
      sql += ` AND (${tagConditions.join(" OR ")})`;
    }

    sql += " ORDER BY rank, m.importance DESC LIMIT @limit";
    params.limit = limit;

    try {
      return db.prepare(sql).all(params) as MemoryRow[];
    } catch {
      // If FTS query syntax is invalid, fall back to LIKE search
      let fallbackSql = `
        SELECT * FROM memories
        WHERE (title LIKE @likeQuery OR content LIKE @likeQuery OR tags LIKE @likeQuery)
          AND status = @status
      `;
      const fallbackParams: Record<string, unknown> = {
        likeQuery: `%${query}%`,
        status,
      };

      if (filters.type) {
        fallbackSql += " AND type = @type";
        fallbackParams.type = filters.type;
      }

      fallbackSql += " ORDER BY importance DESC LIMIT @limit";
      fallbackParams.limit = limit;

      return db.prepare(fallbackSql).all(fallbackParams) as MemoryRow[];
    }
  }

  const wsResults = searchDb(manager.workspace, "workspace");
  const globalResults = searchDb(manager.global, "global");

  return [...wsResults, ...globalResults]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);
}

export function listMemories(
  manager: DatabaseManager,
  filters: {
    type?: MemoryType;
    tags?: string[];
    scope?: MemoryScope;
    status?: MemoryStatus;
    limit?: number;
    offset?: number;
  },
): MemoryRow[] {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const status = filters.status ?? "active";

  function listFromDb(db: Database.Database, dbScope: string): MemoryRow[] {
    if (filters.scope && filters.scope !== dbScope) return [];

    let sql = "SELECT * FROM memories WHERE status = @status";
    const params: Record<string, unknown> = { status };

    if (filters.type) {
      sql += " AND type = @type";
      params.type = filters.type;
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map((_, i) => {
        const key = `tag${i}`;
        params[key] = `%${filters.tags![i]}%`;
        return `tags LIKE @${key}`;
      });
      sql += ` AND (${tagConditions.join(" OR ")})`;
    }

    sql += " ORDER BY importance DESC, updated_at DESC";
    return db.prepare(sql).all(params) as MemoryRow[];
  }

  const wsResults = listFromDb(manager.workspace, "workspace");
  const globalResults = listFromDb(manager.global, "global");

  return [...wsResults, ...globalResults]
    .sort((a, b) => b.importance - a.importance || b.updated_at.localeCompare(a.updated_at))
    .slice(offset, offset + limit);
}

export function getMemoriesByType(
  manager: DatabaseManager,
  type: MemoryType,
  scope?: MemoryScope,
  limit: number = 20,
): MemoryRow[] {
  return listMemories(manager, { type, scope, status: "active", limit });
}

// ─── Session Queries ────────────────────────────────────────────────────────

export function insertSession(
  manager: DatabaseManager,
  session: SessionRow,
): void {
  manager.workspace.prepare(`
    INSERT INTO sessions (id, started_at, ended_at, summary, status)
    VALUES (@id, @started_at, @ended_at, @summary, @status)
  `).run(session);
}

export function getActiveSession(
  manager: DatabaseManager,
): SessionRow | undefined {
  return manager.workspace.prepare(
    "SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
  ).get() as SessionRow | undefined;
}

export function endSession(
  manager: DatabaseManager,
  id: string,
  summary: string,
): boolean {
  const now = new Date().toISOString();
  const result = manager.workspace.prepare(
    "UPDATE sessions SET status = 'completed', ended_at = @ended_at, summary = @summary WHERE id = @id"
  ).run({ id, ended_at: now, summary });
  return result.changes > 0;
}

export function getRecentSessions(
  manager: DatabaseManager,
  limit: number = 5,
): SessionRow[] {
  return manager.workspace.prepare(
    "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?"
  ).all(limit) as SessionRow[];
}
