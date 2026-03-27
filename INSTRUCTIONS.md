# Agent Memory & Context — local-agent-context MCP Server

You have access to a **local-agent-context** MCP server that provides persistent memory across coding sessions. Use it to store and recall project context, decisions, conventions, lessons learned, and tasks. This memory survives across conversations — anything you store now will be available in future sessions.

**Always pass `workspace` in every tool call** so memories are scoped to the correct project. Use the workspace or project name provided by the IDE (e.g., the folder name). If the name isn't available, pass the full path — the server will extract the name automatically.

**Important**: This instruction file may not reflect the latest version of the server. If you see tools you don't recognize, or if the server has tools not listed here, call `sync_instructions` to update this file with the latest documentation. You can also read the `context://instructions` resource for the most current version directly from the running server.

## Session Lifecycle

1. **Start of every conversation**: Call `start_session` with the workspace name and a brief goal. This returns a full context briefing — read it to orient yourself.
2. **During work**: Store important context as you go (see "What to Store" below).
3. **End of conversation**: Call `end_session` with a summary of what was accomplished, decisions made, and anything the next session should know.

## Tools Quick Reference

| Tool | When to Use |
|------|-------------|
| `start_session` | First thing in every conversation. Returns full project context briefing. |
| `end_session` | Last thing before conversation ends. Summarize what was done. |
| `get_context` | Re-orient mid-conversation or get a refreshed context briefing. |
| `store_memory` | Persist any important context (see types below). |
| `recall` | Search for specific past memories by keyword. |
| `log_decision` | Record an architectural or design decision with its rationale. |
| `add_lesson` | Record a gotcha, mistake, or best practice discovered. |
| `list_memories` | Browse all memories, optionally filtered by type/tags. |
| `update_memory` | Modify an existing memory (e.g., mark a task as resolved). |
| `delete_memory` | Archive or remove a memory that's no longer relevant. |
| `sync_instructions` | Update this instruction file to the latest version from the server. Call when tools seem unfamiliar or after a server update. |

## What to Store

Store context **proactively** — don't wait to be asked. If something would be useful in a future session, store it now.

| Type | Store When... | Importance |
|------|---------------|------------|
| `project` | You learn about the tech stack, build commands, project structure, environment setup | 7-9 |
| `convention` | You discover or establish a coding pattern, style rule, naming convention | 7-9 |
| `decision` | An architectural or design choice is made (use `log_decision`) | 7-8 |
| `task` | A work item is identified, started, or needs tracking across sessions | 5-7 |
| `lesson` | Something went wrong, a gotcha was found, or a best practice was learned (use `add_lesson`) | 6-8 |
| `note` | General context that doesn't fit above categories | 3-5 |

**Importance guide**: 1-3 = minor/temporary, 4-6 = useful, 7-8 = important, 9-10 = critical (never forget).

## Scope

- **`workspace`** (default): Memories specific to this project.  
- **`global`**: Cross-project preferences, patterns, or user preferences that apply everywhere.

## Example Calls

```
start_session({ workspace: "my-app", summary: "Implementing user auth" })

store_memory({
  workspace: "my-app",
  type: "convention",
  title: "API error handling pattern",
  content: "All API routes use try/catch with AppError class. Errors return { error: string, code: number }.",
  tags: ["api", "errors"],
  importance: 8
})

log_decision({
  workspace: "my-app",
  title: "JWT over session cookies",
  decision: "Use JWT tokens for API authentication",
  rationale: "Stateless, works with mobile clients, simpler horizontal scaling",
  tags: ["auth", "api"]
})

recall({ workspace: "my-app", query: "authentication" })

end_session({
  workspace: "my-app",
  summary: "Implemented JWT auth with refresh tokens. Login/register endpoints working. Still need: password reset flow, rate limiting on auth endpoints."
})
```

## Key Behaviors

- **If tools seem unfamiliar or you're unsure what's available**, call `sync_instructions` to update this file, or read the `context://instructions` resource directly. The server may have been updated with new tools since this file was written.
- **Always start with `start_session`** — this loads all prior context so you don't repeat past mistakes or contradict past decisions.
- **Store decisions as you make them** — don't batch them at the end. Future sessions need to know *why* choices were made.
- **Use `recall` before re-solving problems** — search for existing lessons and decisions before approaching a problem from scratch.
- **End sessions with actionable summaries** — mention what's done, what's pending, and any blockers. The next session starts by reading this.
- **Tag consistently** — use lowercase, short tags. Reuse existing tags when possible (check with `list_memories`).
