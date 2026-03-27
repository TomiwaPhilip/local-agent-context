import type { DatabaseManager } from "../db/connection.js";
import { storeMemory } from "./memory.js";

// ─── log_decision ───────────────────────────────────────────────────────────

export function logDecision(
  manager: DatabaseManager,
  args: {
    title: string;
    decision: string;
    rationale: string;
    tags?: string[];
    importance?: number;
    scope?: string;
  },
  sessionId?: string,
): string {
  const content = `**Decision:** ${args.decision}\n\n**Rationale:** ${args.rationale}`;

  return storeMemory(
    manager,
    {
      type: "decision",
      title: args.title,
      content,
      tags: args.tags,
      importance: args.importance ?? 7,
      scope: args.scope,
    },
    sessionId,
  );
}

// ─── add_lesson ─────────────────────────────────────────────────────────────

export function addLesson(
  manager: DatabaseManager,
  args: {
    title: string;
    lesson: string;
    context?: string;
    tags?: string[];
    importance?: number;
    scope?: string;
  },
  sessionId?: string,
): string {
  let content = args.lesson;
  if (args.context) {
    content = `**Context:** ${args.context}\n\n**Lesson:** ${args.lesson}`;
  }

  return storeMemory(
    manager,
    {
      type: "lesson",
      title: args.title,
      content,
      tags: args.tags,
      importance: args.importance ?? 6,
      scope: args.scope,
    },
    sessionId,
  );
}
