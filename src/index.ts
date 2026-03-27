#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDatabaseManager } from "./db/connection.js";
import { createServer } from "./server.js";

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

function getWorkspacePath(): string {
  // Check --workspace flag
  const wsIndex = process.argv.indexOf("--workspace");
  if (wsIndex !== -1 && process.argv[wsIndex + 1]) {
    return process.argv[wsIndex + 1];
  }

  // Check WORKSPACE_PATH env var
  if (process.env.WORKSPACE_PATH) {
    return process.env.WORKSPACE_PATH;
  }

  // Fall back to current working directory
  return process.cwd();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const workspacePath = getWorkspacePath();

  const manager = createDatabaseManager(workspacePath);
  const server = createServer(manager);
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on("SIGINT", () => {
    manager.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    manager.close();
    process.exit(0);
  });

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
