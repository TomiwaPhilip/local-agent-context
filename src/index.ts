#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConnectionPool } from "./db/connection.js";
import { createServer } from "./server.js";

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

function getDefaultWorkspace(): string | undefined {
  // Check --workspace flag (optional — sets default workspace for tools)
  const wsIndex = process.argv.indexOf("--workspace");
  if (wsIndex !== -1 && process.argv[wsIndex + 1]) {
    return process.argv[wsIndex + 1];
  }

  // Check WORKSPACE_PATH env var
  if (process.env.WORKSPACE_PATH) {
    return process.env.WORKSPACE_PATH;
  }

  // No default — agents will pass workspace dynamically per tool call
  return undefined;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const defaultWorkspace = getDefaultWorkspace();

  const pool = new ConnectionPool(defaultWorkspace);
  const server = createServer(pool);
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on("SIGINT", () => {
    pool.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    pool.close();
    process.exit(0);
  });

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
