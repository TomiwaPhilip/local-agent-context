import { nanoid } from "nanoid";
import type { DatabaseManager } from "../db/connection.js";
import {
  insertMemory,
  searchMemories,
  updateMemory as updateMemoryQuery,
  deleteMemory as deleteMemoryQuery,
  listMemories as listMemoriesQuery,
} from "../db/queries.js";
import {
  rowToMemory,
  formatMemory,
  type MemoryRow,
} from "../types.js";

// ─── store_memory ───────────────────────────────────────────────────────────

export function storeMemory(
  manager: DatabaseManager,
  args: {
    type: string;
    title: string;
    content: string;
    tags?: string[];
    importance?: number;
    scope?: string;
  },
  sessionId?: string,
): string {
  const now = new Date().toISOString();
  const memory: MemoryRow = {
    id: nanoid(12),
    scope: (args.scope ?? "workspace") as MemoryRow["scope"],
    type: args.type as MemoryRow["type"],
    title: args.title,
    content: args.content,
    tags: JSON.stringify(args.tags ?? []),
    importance: args.importance ?? 5,
    status: "active",
    created_at: now,
    updated_at: now,
    session_id: sessionId ?? null,
  };

  insertMemory(manager, memory);

  const mem = rowToMemory(memory);
  return `Memory stored successfully.\n\n${formatMemory(mem)}`;
}

// ─── recall ─────────────────────────────────────────────────────────────────

export function recall(
  manager: DatabaseManager,
  args: {
    query: string;
    type?: string;
    tags?: string[];
    scope?: string;
    status?: string;
    limit?: number;
  },
): string {
  const rows = searchMemories(manager, args.query, {
    type: args.type as MemoryRow["type"] | undefined,
    tags: args.tags,
    scope: args.scope as MemoryRow["scope"] | undefined,
    status: args.status as MemoryRow["status"] | undefined,
    limit: args.limit,
  });

  if (rows.length === 0) {
    return `No memories found matching "${args.query}".`;
  }

  const memories = rows.map(rowToMemory);
  const formatted = memories.map(formatMemory).join("\n\n---\n\n");
  return `Found ${memories.length} memor${memories.length === 1 ? "y" : "ies"}:\n\n${formatted}`;
}

// ─── update_memory ──────────────────────────────────────────────────────────

export function updateMemory(
  manager: DatabaseManager,
  args: {
    id: string;
    title?: string;
    content?: string;
    tags?: string[];
    importance?: number;
    status?: string;
    type?: string;
  },
): string {
  const updates: Record<string, unknown> = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.content !== undefined) updates.content = args.content;
  if (args.tags !== undefined) updates.tags = JSON.stringify(args.tags);
  if (args.importance !== undefined) updates.importance = args.importance;
  if (args.status !== undefined) updates.status = args.status;
  if (args.type !== undefined) updates.type = args.type;

  const success = updateMemoryQuery(manager, args.id, updates);

  if (!success) {
    return `Memory with ID "${args.id}" not found.`;
  }

  return `Memory "${args.id}" updated successfully.`;
}

// ─── delete_memory ──────────────────────────────────────────────────────────

export function deleteMemoryTool(
  manager: DatabaseManager,
  args: { id: string; hard?: boolean },
): string {
  const hard = args.hard ?? false;
  const success = deleteMemoryQuery(manager, args.id, hard);

  if (!success) {
    return `Memory with ID "${args.id}" not found.`;
  }

  return hard
    ? `Memory "${args.id}" permanently deleted.`
    : `Memory "${args.id}" archived. Use hard delete to permanently remove.`;
}

// ─── list_memories ──────────────────────────────────────────────────────────

export function listMemoriesTool(
  manager: DatabaseManager,
  args: {
    type?: string;
    tags?: string[];
    scope?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): string {
  const rows = listMemoriesQuery(manager, {
    type: args.type as MemoryRow["type"] | undefined,
    tags: args.tags,
    scope: args.scope as MemoryRow["scope"] | undefined,
    status: args.status as MemoryRow["status"] | undefined,
    limit: args.limit,
    offset: args.offset,
  });

  if (rows.length === 0) {
    return "No memories found matching the given filters.";
  }

  const memories = rows.map(rowToMemory);
  const formatted = memories.map(formatMemory).join("\n\n---\n\n");
  return `Showing ${memories.length} memor${memories.length === 1 ? "y" : "ies"}:\n\n${formatted}`;
}
