# local-agent-context

A local MCP server that gives AI coding agents persistent memory and context across sessions. Works with VS Code (Copilot), Cursor, Claude, and any MCP-compatible client.

## Why?

Every time you start a new conversation with an AI coding agent, it forgets everything. This server gives agents a local, fast, searchable memory backed by SQLite — so they remember your project conventions, past decisions, active tasks, and lessons learned.

## Quick Start

### Global Setup (Recommended)

Configure once — works across all projects. Agents pass the workspace path dynamically.

**VS Code (GitHub Copilot)** — add to User Settings (`MCP: Open User Configuration`):

```json
{
  "servers": {
    "agent-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "local-agent-context"]
    }
  }
}
```

**Cursor** — add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-context": {
      "command": "npx",
      "args": ["-y", "local-agent-context"]
    }
  }
}
```

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-context": {
      "command": "npx",
      "args": ["-y", "local-agent-context"]
    }
  }
}
```

### Per-Project Setup (Alternative)

If you prefer a fixed workspace, pass `--workspace` at startup:

**VS Code** — add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "agent-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "local-agent-context", "--workspace", "${workspaceFolder}"]
    }
  }
}
```

## How It Works

**Name-based workspaces**: Every tool accepts an optional `workspace` parameter — the workspace or project name from your IDE (e.g., `"my-app"`). If a full path is passed instead, the basename is extracted automatically. The server lazily opens and caches workspace databases on demand.

**Fallback chain**: Tool `workspace` arg → `--workspace` CLI flag → `WORKSPACE_PATH` env var → global-only mode.

**Centralized storage** (nothing pollutes your project directories):
- **Workspace memories**: `~/.local-agent-context/workspaces/<name>/memory.db`
- **Global memory**: `~/.local-agent-context/global.db`

Both are SQLite databases with FTS5 full-text search.

## Tools (10)

All tools accept an optional `workspace` parameter — the project name (e.g., `"my-app"`) or path. Agents should pass the IDE's workspace/project name.

### Core Memory

| Tool | Description |
|------|-------------|
| `store_memory` | Store a memory with type, title, content, tags, importance (1-10), and scope |
| `recall` | Full-text search across all memories. Filter by type, tags, scope, status |
| `update_memory` | Update any fields of an existing memory by ID |
| `delete_memory` | Soft-delete (archive) or hard-delete a memory by ID |
| `list_memories` | List memories with optional filters and pagination |

### Context

| Tool | Description |
|------|-------------|
| `get_context` | Get a curated briefing: project info, active tasks, conventions, decisions, lessons, global prefs |

### Session Lifecycle

| Tool | Description |
|------|-------------|
| `start_session` | Start a coding session. Returns full workspace context. Auto-closes any dangling sessions |
| `end_session` | End session with a summary. Summary is stored as a searchable memory |

### Shortcuts

| Tool | Description |
|------|-------------|
| `log_decision` | Store an architectural decision with rationale (importance defaults to 7) |
| `add_lesson` | Record a lesson learned with optional context (importance defaults to 6) |

## Memory Types

| Type | Use For |
|------|---------|
| `project` | Stack, structure, build commands, environment setup |
| `convention` | Coding style, patterns, naming conventions |
| `decision` | Architectural choices with rationale |
| `task` | Active work items, TODOs, features in progress |
| `lesson` | Gotchas, things that went wrong, best practices |
| `note` | General-purpose notes |
| `session_summary` | Auto-generated from `end_session` |

## Resources (3)

| URI | Description |
|-----|-------------|
| `context://workspace` | Full workspace context (same as `get_context`) |
| `context://recent-sessions` | Last 5 session summaries |
| `context://active-tasks` | All active task memories |

## Typical Agent Workflow

1. **Session start**: Agent calls `start_session` with `workspace` → gets full project briefing
2. **During work**: Agent uses `store_memory`, `log_decision`, `add_lesson` with `workspace` to persist context
3. **Searching**: Agent uses `recall` with `workspace` to find relevant past memories
4. **Session end**: Agent calls `end_session` with `workspace` and a summary

## Configuration

The server accepts these optional startup flags:

- `--workspace <path>` — default workspace path (used when tools don't pass `workspace`)
- `WORKSPACE_PATH` env var — alternative to `--workspace`

If neither is set, the server runs in **global-only mode** until agents pass `workspace` in tool calls.

## Agent Instructions

Copy [`INSTRUCTIONS.md`](INSTRUCTIONS.md) into your IDE's instruction system so agents automatically use this server:

| IDE | Where to Add |
|-----|-------------|
| **VS Code (Copilot)** | Copy contents into `.github/copilot-instructions.md`, or save as `.github/instructions/agent-memory.instructions.md` |
| **Cursor** | Copy contents into `.cursorrules` or `.cursor/rules/agent-memory.mdc` |
| **Claude Desktop** | Paste into your Project Instructions |

This teaches the agent to call `start_session` at the start of every conversation, store decisions/conventions/lessons as they arise, and call `end_session` with a summary at the end.

## Development

```bash
git clone https://github.com/yourname/local-agent-context
cd local-agent-context
npm install
npm run build
node dist/index.js --workspace /path/to/project
```

## License

MIT
