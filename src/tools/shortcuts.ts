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

// ─── store_resource ─────────────────────────────────────────────────────────

export function storeResource(
  manager: DatabaseManager,
  args: {
    title: string;
    url: string;
    summary: string;
    tags?: string[];
    importance?: number;
    scope?: string;
  },
  sessionId?: string,
): string {
  const content = `**URL:** ${args.url}\n\n**Summary:** ${args.summary}`;

  return storeMemory(
    manager,
    {
      type: "resource",
      title: args.title,
      content,
      tags: args.tags,
      importance: args.importance ?? 6,
      scope: args.scope,
    },
    sessionId,
  );
}

// ─── store_research ─────────────────────────────────────────────────────────

export function storeResearch(
  manager: DatabaseManager,
  args: {
    title: string;
    question: string;
    findings: string;
    sources?: string[];
    tags?: string[];
    importance?: number;
    scope?: string;
  },
  sessionId?: string,
): string {
  const sourcesSection = args.sources?.length
    ? `\n\n**Sources:**\n${args.sources.map((s) => `- ${s}`).join("\n")}`
    : "";
  const content = `**Question:** ${args.question}\n\n**Findings:** ${args.findings}${sourcesSection}`;

  return storeMemory(
    manager,
    {
      type: "research",
      title: args.title,
      content,
      tags: args.tags,
      importance: args.importance ?? 7,
      scope: args.scope,
    },
    sessionId,
  );
}
