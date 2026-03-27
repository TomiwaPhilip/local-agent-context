# local-agent-context

A local MCP server that gives AI coding agents persistent memory and context across sessions. Works with VS Code (Copilot), Cursor, Claude, and any MCP-compatible client.

## Why?

Every time you start a new conversation with an AI coding agent, it forgets everything. This server gives agents a local, fast, searchable memory backed by SQLite — so they remember your project conventions, past decisions, active tasks, and lessons learned.

## Quick Start

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

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

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-context": {
      "command": "npx",
      "args": ["-y", "local-agent-context", "--workspace", "/absolute/path/to/your/project"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-context": {
      "command": "npx",
      "args": ["-y", "local-agent-context", "--workspace", "/absolute/path/to/your/project"]
    }
  }
}
```

## Storage

- **Workspace memory**: `<project>/.agent-context/memory.db` — project-specific memories
- **Global memory**: `~/.local-agent-context/global.db` — cross-project preferences and patterns

Both are SQLite databases with FTS5 full-text search. Add `.agent-context/` to your `.gitignore`.

## Tools (10)

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

1. **Session start**: Agent calls `start_session` → gets full workspace briefing
2. **During work**: Agent uses `store_memory`, `log_decision`, `add_lesson` to persist context
3. **Searching**: Agent uses `recall` to find relevant past memories
4. **Session end**: Agent calls `end_session` with a summary

## Configuration

The server accepts:

- `--workspace <path>` — path to the project (default: current working directory)
- `WORKSPACE_PATH` environment variable — alternative to `--workspace`

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
