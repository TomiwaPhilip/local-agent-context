import { nanoid } from "nanoid";
import type { DatabaseManager } from "../db/connection.js";
import {
  insertSession,
  getActiveSession,
  endSession as endSessionQuery,
  getRecentSessions,
  insertMemory,
  getMemoriesByType,
  listMemories,
} from "../db/queries.js";
import {
  rowToMemory,
  formatMemory,
  formatSession,
  type SessionRow,
  type MemoryRow,
} from "../types.js";

// ─── start_session ──────────────────────────────────────────────────────────

export function startSession(
  manager: DatabaseManager,
  args: { summary?: string },
): string {
  // End any dangling active session
  const active = getActiveSession(manager);
  if (active) {
    endSessionQuery(manager, active.id, "(auto-closed: new session started)");
  }

  const now = new Date().toISOString();
  const session: SessionRow = {
    id: nanoid(12),
    started_at: now,
    ended_at: null,
    summary: args.summary ?? null,
    status: "active",
  };

  insertSession(manager, session);

  // Build context summary
  const context = buildContextSummary(manager);

  return `Session started: ${session.id}\n\n${context}`;
}

// ─── end_session ────────────────────────────────────────────────────────────

export function endSessionTool(
  manager: DatabaseManager,
  args: { summary: string },
): string {
  const active = getActiveSession(manager);

  if (!active) {
    return "No active session to end.";
  }

  endSessionQuery(manager, active.id, args.summary);

  // Store the summary as a searchable memory
  const now = new Date().toISOString();
  const summaryMemory: MemoryRow = {
    id: nanoid(12),
    scope: "workspace",
    type: "session_summary",
    title: `Session summary — ${active.started_at.split("T")[0]}`,
    content: args.summary,
    tags: JSON.stringify(["session"]),
    importance: 4,
    status: "active",
    created_at: now,
    updated_at: now,
    session_id: active.id,
  };

  insertMemory(manager, summaryMemory);

  return `Session ${active.id} ended.\nSummary stored as memory ${summaryMemory.id}.`;
}

// ─── Context builder ────────────────────────────────────────────────────────

function buildContextSummary(manager: DatabaseManager): string {
  const sections: string[] = [];

  // Recent sessions
  const recentSessions = getRecentSessions(manager, 3);
  if (recentSessions.length > 1) {
    // Skip the first one (just created)
    const past = recentSessions.slice(1);
    if (past.length > 0) {
      sections.push("## Recent Sessions\n" + past.map(formatSession).join("\n\n"));
    }
  }

  // Project info
  const projectMemories = getMemoriesByType(manager, "project", undefined, 5);
  if (projectMemories.length > 0) {
    sections.push("## Project Info\n" + projectMemories.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n"));
  }

  // Active tasks
  const tasks = getMemoriesByType(manager, "task", undefined, 10);
  if (tasks.length > 0) {
    sections.push("## Active Tasks\n" + tasks.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n"));
  }

  // Conventions
  const conventions = getMemoriesByType(manager, "convention", undefined, 10);
  if (conventions.length > 0) {
    sections.push("## Conventions\n" + conventions.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n"));
  }

  // Recent decisions
  const decisions = getMemoriesByType(manager, "decision", undefined, 5);
  if (decisions.length > 0) {
    sections.push("## Recent Decisions\n" + decisions.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n"));
  }

  // Lessons
  const lessons = getMemoriesByType(manager, "lesson", undefined, 5);
  if (lessons.length > 0) {
    sections.push("## Lessons Learned\n" + lessons.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n"));
  }

  // Important global memories
  const globals = listMemories(manager, { scope: "global", status: "active", limit: 5 });
  if (globals.length > 0) {
    sections.push("## Global Preferences\n" + globals.map(r => formatMemory(rowToMemory(r))).join("\n\n---\n\n"));
  }

  if (sections.length === 0) {
    return "# Workspace Context\n\nNo memories stored yet. Use `store_memory` to add project info, conventions, and other context.";
  }

  return "# Workspace Context\n\n" + sections.join("\n\n");
}

export { buildContextSummary };
