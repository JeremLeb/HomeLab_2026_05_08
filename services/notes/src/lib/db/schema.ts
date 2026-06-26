import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "notes.db");

fs.mkdirSync(DB_DIR, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
      key_points TEXT NOT NULL DEFAULT '[]',
      parent_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      ai_provider TEXT NOT NULL DEFAULT 'none',
      ollama_url TEXT NOT NULL DEFAULT 'http://localhost:11434',
      ollama_model TEXT NOT NULL DEFAULT 'llama3',
      openai_key TEXT NOT NULL DEFAULT '',
      openai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      anthropic_key TEXT NOT NULL DEFAULT '',
      anthropic_model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
      link_threshold REAL NOT NULL DEFAULT 0.2,
      theme TEXT NOT NULL DEFAULT 'dark'
    );

    CREATE TABLE IF NOT EXISTS note_links (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      to_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      strength REAL NOT NULL DEFAULT 0,
      matched_concepts TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(from_id, to_id)
    );

    CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_note_links_to ON note_links(to_id);
    CREATE INDEX IF NOT EXISTS idx_note_links_from ON note_links(from_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      id UNINDEXED,
      title,
      content_text,
      content='',
      tokenize='porter ascii'
    );

    INSERT INTO settings(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      duration_seconds REAL NOT NULL DEFAULT 0,
      transcript TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_recordings_note ON recordings(note_id);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL DEFAULT '',
      mime TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);

    CREATE TABLE IF NOT EXISTS note_versions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS note_embeddings (
      note_id TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
      vector TEXT NOT NULL DEFAULT '[]',
      text_hash TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Guarded migrations for note columns added after initial deploy
  const noteCols = db.prepare("PRAGMA table_info(notes)").all() as { name: string }[];
  const noteColNames = noteCols.map((c) => c.name);
  if (!noteColNames.includes("tags")) {
    db.exec("ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
  }
  if (!noteColNames.includes("is_template")) {
    db.exec("ALTER TABLE notes ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0");
  }
  if (!noteColNames.includes("status")) {
    db.exec("ALTER TABLE notes ADD COLUMN status TEXT NOT NULL DEFAULT ''");
  }

  // Guarded migrations for columns added after initial deploy
  const settingsCols = db.prepare("PRAGMA table_info(settings)").all() as { name: string }[];
  const settingsColNames = settingsCols.map((c) => c.name);
  if (!settingsColNames.includes("whisper_url")) {
    db.exec("ALTER TABLE settings ADD COLUMN whisper_url TEXT NOT NULL DEFAULT ''");
  }
}
