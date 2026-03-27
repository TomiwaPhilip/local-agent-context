import Database from "better-sqlite3";

// ─── Table Definitions ──────────────────────────────────────────────────────

const MEMORIES_TABLE = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'workspace',
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  importance INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  session_id TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
`;

const SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);
`;

// FTS5 virtual table for full-text search across memories
const MEMORIES_FTS = `
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  title,
  content,
  tags,
  content='memories',
  content_rowid='rowid'
);
`;

// Triggers to keep FTS index in sync with the memories table
const FTS_INSERT_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;
`;

const FTS_DELETE_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags);
END;
`;

const FTS_UPDATE_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags);
  INSERT INTO memories_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;
`;

// Indexes for common query patterns
const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);`,
  `CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope);`,
  `CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);`,
  `CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);`,
];

// ─── Schema Initialization ──────────────────────────────────────────────────

export function initializeSchema(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(SESSIONS_TABLE);
  db.exec(MEMORIES_TABLE);
  db.exec(MEMORIES_FTS);
  db.exec(FTS_INSERT_TRIGGER);
  db.exec(FTS_DELETE_TRIGGER);
  db.exec(FTS_UPDATE_TRIGGER);

  for (const index of INDEXES) {
    db.exec(index);
  }
}
