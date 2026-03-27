import type { DatabaseManager } from "../db/connection.js";
import { getRecentSessions, getMemoriesByType } from "../db/queries.js";
import { rowToMemory, formatMemory, formatSession } from "../types.js";
import { buildContextSummary } from "../tools/session.js";

// ─── Resource Handlers ──────────────────────────────────────────────────────

export function workspaceContextResource(manager: DatabaseManager): string {
  return buildContextSummary(manager);
}

export function recentSessionsResource(manager: DatabaseManager): string {
  const sessions = getRecentSessions(manager, 5);
  if (sessions.length === 0) {
    return "No sessions recorded yet.";
  }
  return "# Recent Sessions\n\n" + sessions.map(formatSession).join("\n\n---\n\n");
}

export function activeTasksResource(manager: DatabaseManager): string {
  const tasks = getMemoriesByType(manager, "task", undefined, 20);
  if (tasks.length === 0) {
    return "No active tasks.";
  }
  const formatted = tasks.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n");
  return "# Active Tasks\n\n" + formatted;
}
