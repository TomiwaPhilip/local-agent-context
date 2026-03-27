import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConnectionPool } from "./db/connection.js";
import { getActiveSession } from "./db/queries.js";
import {
  StoreMemorySchema,
  RecallSchema,
  UpdateMemorySchema,
  DeleteMemorySchema,
  ListMemoriesSchema,
  GetContextSchema,
  StartSessionSchema,
  EndSessionSchema,
  LogDecisionSchema,
  AddLessonSchema,
  SyncInstructionsSchema,
} from "./types.js";
import {
  storeMemory,
  recall,
  updateMemory,
  deleteMemoryTool,
  listMemoriesTool,
} from "./tools/memory.js";
import { startSession, endSessionTool } from "./tools/session.js";
import { getContext } from "./tools/context.js";
import { logDecision, addLesson } from "./tools/shortcuts.js";
import { syncInstructions, getInstructions } from "./tools/instructions.js";
import {
  workspaceContextResource,
  recentSessionsResource,
  activeTasksResource,
} from "./resources/context.js";

// ─── Server Factory ─────────────────────────────────────────────────────────

export function createServer(pool: ConnectionPool): McpServer {
  const server = new McpServer({
    name: "local-agent-context",
    version: "0.5.0",
  });

  // Helper: get current active session ID for linking memories
  function activeSessionId(workspace?: string): string | undefined {
    const manager = pool.getManager(workspace);
    return getActiveSession(manager)?.id;
  }

  // ── Tools ───────────────────────────────────────────────────────────────

  server.tool(
    "store_memory",
    "Store a new memory (project info, convention, decision, task, lesson, or note). Memories persist across sessions and are searchable. Pass workspace path for project-specific memories.",
    StoreMemorySchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: storeMemory(manager, args, activeSessionId(args.workspace)) }] };
    },
  );

  server.tool(
    "recall",
    "Search memories by query using full-text search. Filter by type, tags, scope, or status. Pass workspace to include project-specific memories.",
    RecallSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: recall(manager, args) }] };
    },
  );

  server.tool(
    "update_memory",
    "Update an existing memory by ID. Can change title, content, tags, importance, status, or type.",
    UpdateMemorySchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: updateMemory(manager, args) }] };
    },
  );

  server.tool(
    "delete_memory",
    "Delete a memory by ID. By default, soft-deletes (archives). Set hard=true to permanently remove.",
    DeleteMemorySchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: deleteMemoryTool(manager, args) }] };
    },
  );

  server.tool(
    "list_memories",
    "List all memories with optional filters (type, tags, scope, status). Supports pagination with limit/offset.",
    ListMemoriesSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: listMemoriesTool(manager, args) }] };
    },
  );

  server.tool(
    "get_context",
    "Get a curated workspace context briefing: project info, active tasks, conventions, recent decisions, lessons, and global preferences. Pass workspace for project-specific context.",
    GetContextSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: getContext(manager) }] };
    },
  );

  server.tool(
    "start_session",
    "Start a new coding session. Auto-closes any dangling previous session. Returns the full workspace context as a briefing.",
    StartSessionSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: startSession(manager, args) }] };
    },
  );

  server.tool(
    "end_session",
    "End the current coding session with a summary. The summary is stored as a searchable session_summary memory for future reference.",
    EndSessionSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: endSessionTool(manager, args) }] };
    },
  );

  server.tool(
    "log_decision",
    "Log an architectural or design decision with its rationale. Stored as a high-importance decision memory.",
    LogDecisionSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: logDecision(manager, args, activeSessionId(args.workspace)) }] };
    },
  );

  server.tool(
    "add_lesson",
    "Record a lesson learned — something that went wrong, a gotcha, or a best practice discovered. Stored as a lesson memory.",
    AddLessonSchema,
    async (args) => {
      const manager = pool.getManager(args.workspace);
      return { content: [{ type: "text", text: addLesson(manager, args, activeSessionId(args.workspace)) }] };
    },
  );

  server.tool(
    "sync_instructions",
    "Sync the agent instruction file to installed IDEs (VS Code, Cursor). Call this after updating the server to ensure agents have the latest usage guide. Auto-detects IDE paths or accepts an explicit path.",
    SyncInstructionsSchema,
    async (args) => ({
      content: [{ type: "text", text: syncInstructions(args) }],
    }),
  );

  // ── Resources ─────────────────────────────────────────────────────────────
  // Resources use the default workspace (from --workspace CLI flag).
  // For dynamic workspace access, use tools instead.

  server.resource(
    "context://workspace",
    "context://workspace",
    { description: "Full workspace context using the default workspace (from --workspace flag)" },
    async () => {
      const manager = pool.getManager();
      return {
        contents: [{
          uri: "context://workspace",
          mimeType: "text/markdown",
          text: workspaceContextResource(manager),
        }],
      };
    },
  );

  server.resource(
    "context://recent-sessions",
    "context://recent-sessions",
    { description: "Last 5 session summaries from the default workspace" },
    async () => {
      const manager = pool.getManager();
      return {
        contents: [{
          uri: "context://recent-sessions",
          mimeType: "text/markdown",
          text: recentSessionsResource(manager),
        }],
      };
    },
  );

  server.resource(
    "context://active-tasks",
    "context://active-tasks",
    { description: "All active task memories from the default workspace" },
    async () => {
      const manager = pool.getManager();
      return {
        contents: [{
          uri: "context://active-tasks",
          mimeType: "text/markdown",
          text: activeTasksResource(manager),
        }],
      };
    },
  );

  server.resource(
    "context://instructions",
    "context://instructions",
    { description: "The latest agent instructions bundled with the current server version. Always matches the running server." },
    async () => ({
      contents: [{
        uri: "context://instructions",
        mimeType: "text/markdown",
        text: getInstructions(),
      }],
    }),
  );

  return server;
}
