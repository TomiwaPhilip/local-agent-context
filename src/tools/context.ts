import type { DatabaseManager } from "../db/connection.js";
import { buildContextSummary } from "./session.js";

// ─── get_context ────────────────────────────────────────────────────────────

export function getContext(manager: DatabaseManager): string {
  return buildContextSummary(manager);
}
