import { z } from "zod";

// ─── Memory Types ────────────────────────────────────────────────────────────

export const MemoryType = z.enum([
  "project",          // Project-level info (stack, structure, build commands)
  "convention",       // Coding conventions, style rules, patterns used
  "decision",         // Architectural or design decisions with rationale
  "task",             // Active work items, TODOs, in-progress features
  "lesson",           // Lessons learned, gotchas, things that went wrong
  "note",             // General-purpose notes
  "session_summary",  // Auto-generated session summaries
]);
export type MemoryType = z.infer<typeof MemoryType>;

export const MemoryScope = z.enum(["workspace", "global"]);
export type MemoryScope = z.infer<typeof MemoryScope>;

export const MemoryStatus = z.enum(["active", "archived", "resolved"]);
export type MemoryStatus = z.infer<typeof MemoryStatus>;

export const SessionStatus = z.enum(["active", "completed", "abandoned"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

// ─── Database Row Types ──────────────────────────────────────────────────────

export interface MemoryRow {
  id: string;
  scope: MemoryScope;
  type: MemoryType;
  title: string;
  content: string;
  tags: string; // JSON array stored as text
  importance: number;
  status: MemoryStatus;
  created_at: string;
  updated_at: string;
  session_id: string | null;
}

export interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  status: SessionStatus;
}

// ─── Application Types ──────────────────────────────────────────────────────

export interface Memory extends Omit<MemoryRow, "tags"> {
  tags: string[];
}

export interface Session extends SessionRow {}

// ─── Tool Parameter Schemas ─────────────────────────────────────────────────

export const StoreMemorySchema = {
  type: MemoryType,
  title: z.string().describe("Short descriptive title for the memory"),
  content: z.string().describe("The full content/body of the memory"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
  importance: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("Importance level 1-10 (default: 5). Use 8-10 for critical conventions/decisions, 1-3 for minor notes"),
  scope: MemoryScope.optional().describe("'workspace' (default) for project-specific, 'global' for cross-project"),
};

export const RecallSchema = {
  query: z.string().describe("Search query — matched against titles, content, and tags via full-text search"),
  type: MemoryType.optional().describe("Filter by memory type"),
  tags: z.array(z.string()).optional().describe("Filter by tags (matches any)"),
  scope: MemoryScope.optional().describe("Filter by scope"),
  status: MemoryStatus.optional().describe("Filter by status (default: active)"),
  limit: z.number().min(1).max(50).optional().describe("Max results (default: 10)"),
};

export const UpdateMemorySchema = {
  id: z.string().describe("The memory ID to update"),
  title: z.string().optional().describe("New title"),
  content: z.string().optional().describe("New content"),
  tags: z.array(z.string()).optional().describe("Replace tags"),
  importance: z.number().min(1).max(10).optional().describe("New importance level"),
  status: MemoryStatus.optional().describe("New status"),
  type: MemoryType.optional().describe("New type"),
};

export const DeleteMemorySchema = {
  id: z.string().describe("The memory ID to delete"),
  hard: z.boolean().optional().describe("If true, permanently delete. Otherwise archive (soft-delete). Default: false"),
};

export const ListMemoriesSchema = {
  type: MemoryType.optional().describe("Filter by memory type"),
  tags: z.array(z.string()).optional().describe("Filter by tags (matches any)"),
  scope: MemoryScope.optional().describe("Filter by scope"),
  status: MemoryStatus.optional().describe("Filter by status (default: active)"),
  limit: z.number().min(1).max(100).optional().describe("Max results (default: 20)"),
  offset: z.number().min(0).optional().describe("Offset for pagination (default: 0)"),
};

export const StartSessionSchema = {
  summary: z.string().optional().describe("Optional initial summary/goal for this session"),
};

export const EndSessionSchema = {
  summary: z.string().describe("Summary of what was accomplished in this session. This becomes a searchable memory."),
};

export const LogDecisionSchema = {
  title: z.string().describe("Short title for the decision (e.g., 'Use SQLite over PostgreSQL')"),
  decision: z.string().describe("What was decided"),
  rationale: z.string().describe("Why this decision was made"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
  importance: z.number().min(1).max(10).optional().describe("Importance 1-10 (default: 7)"),
  scope: MemoryScope.optional().describe("'workspace' (default) or 'global'"),
};

export const AddLessonSchema = {
  title: z.string().describe("Short title for the lesson"),
  lesson: z.string().describe("What was learned"),
  context: z.string().optional().describe("The situation/context where this lesson was learned"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
  importance: z.number().min(1).max(10).optional().describe("Importance 1-10 (default: 6)"),
  scope: MemoryScope.optional().describe("'workspace' (default) or 'global'"),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function rowToMemory(row: MemoryRow): Memory {
  return {
    ...row,
    tags: JSON.parse(row.tags || "[]"),
  };
}

export function formatMemory(mem: Memory): string {
  const tags = mem.tags.length > 0 ? ` [${mem.tags.join(", ")}]` : "";
  const importance = mem.importance >= 7 ? ` ⚡${mem.importance}` : "";
  return `### ${mem.title}${importance}${tags}
**Type:** ${mem.type} | **Scope:** ${mem.scope} | **ID:** ${mem.id}
**Created:** ${mem.created_at} | **Status:** ${mem.status}

${mem.content}`;
}

export function formatSession(session: Session): string {
  const duration = session.ended_at
    ? ` → ${session.ended_at}`
    : " (active)";
  return `**Session ${session.id}** | ${session.started_at}${duration}
${session.summary || "(no summary)"}`;
}
