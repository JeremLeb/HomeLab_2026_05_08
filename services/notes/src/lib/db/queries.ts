import { getDb } from "./schema";
import { randomUUID } from "crypto";

export type Note = {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteLink = {
  id: string;
  fromId: string;
  toId: string;
  strength: number;
  matchedConcepts: string[];
  createdAt: string;
};

export type Settings = {
  aiProvider: string;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey: string;
  openaiModel: string;
  anthropicKey: string;
  anthropicModel: string;
  linkThreshold: number;
  theme: string;
  whisperUrl: string;
};

export type Recording = {
  id: string;
  noteId: string;
  filename: string;
  durationSeconds: number;
  transcript: string;
  createdAt: string;
};

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    keyPoints: JSON.parse((row.key_points as string) || "[]"),
    parentId: (row.parent_id as string | null) || null,
    position: row.position as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSettings(row: Record<string, unknown>): Settings {
  return {
    aiProvider: row.ai_provider as string,
    ollamaUrl: row.ollama_url as string,
    ollamaModel: row.ollama_model as string,
    openaiKey: row.openai_key as string,
    openaiModel: row.openai_model as string,
    anthropicKey: row.anthropic_key as string,
    anthropicModel: row.anthropic_model as string,
    linkThreshold: row.link_threshold as number,
    theme: row.theme as string,
    whisperUrl: (row.whisper_url as string) || "",
  };
}

function rowToRecording(row: Record<string, unknown>): Recording {
  return {
    id: row.id as string,
    noteId: row.note_id as string,
    filename: row.filename as string,
    durationSeconds: row.duration_seconds as number,
    transcript: row.transcript as string,
    createdAt: row.created_at as string,
  };
}

// ── Notes ──────────────────────────────────────────────────────────────────

export function listNotes(): Note[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, parent_id, position, created_at, updated_at FROM notes ORDER BY position ASC, created_at ASC"
    )
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    ...rowToNote({ ...r, content: "", key_points: "[]" }),
  }));
}

export function getNoteById(id: string): Note | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM notes WHERE id = ?")
    .get(id) as Record<string, unknown> | null;
  return row ? rowToNote(row) : null;
}

export function getNoteByTitle(title: string): Note | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM notes WHERE title = ? COLLATE NOCASE LIMIT 1")
    .get(title) as Record<string, unknown> | null;
  return row ? rowToNote(row) : null;
}

export function createNote(data: {
  title?: string;
  parentId?: string | null;
  content?: string;
}): Note {
  const db = getDb();
  const id = randomUUID();
  const maxPos = (
    db
      .prepare(
        "SELECT COALESCE(MAX(position), -1) as m FROM notes WHERE parent_id IS ?"
      )
      .get(data.parentId ?? null) as { m: number }
  ).m;

  if (data.content !== undefined) {
    db.prepare(
      `INSERT INTO notes (id, title, parent_id, position, content) VALUES (?, ?, ?, ?, ?)`
    ).run(
      id,
      data.title ?? "Untitled",
      data.parentId ?? null,
      maxPos + 1,
      data.content
    );
  } else {
    db.prepare(
      `INSERT INTO notes (id, title, parent_id, position) VALUES (?, ?, ?, ?)`
    ).run(id, data.title ?? "Untitled", data.parentId ?? null, maxPos + 1);
  }

  return getNoteById(id)!;
}

export function updateNote(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    keyPoints: string[];
    parentId: string | null;
    position: number;
  }>
): Note | null {
  const db = getDb();
  const fields: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.content !== undefined) {
    fields.push("content = ?");
    values.push(data.content);
  }
  if (data.keyPoints !== undefined) {
    fields.push("key_points = ?");
    values.push(JSON.stringify(data.keyPoints));
  }
  if (data.parentId !== undefined) {
    fields.push("parent_id = ?");
    values.push(data.parentId);
  }
  if (data.position !== undefined) {
    fields.push("position = ?");
    values.push(data.position);
  }

  if (fields.length === 1) return getNoteById(id);

  values.push(id);
  db.prepare(`UPDATE notes SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values
  );

  // Update FTS index
  if (data.content !== undefined || data.title !== undefined) {
    const note = getNoteById(id);
    if (note) {
      const plainText = note.content
        .replace(/"text":"([^"]*)"/g, "$1")
        .replace(/[{}"\\[\]]/g, " ");
      db.prepare("DELETE FROM notes_fts WHERE id = ?").run(id);
      db.prepare(
        "INSERT INTO notes_fts(id, title, content_text) VALUES (?, ?, ?)"
      ).run(id, note.title, plainText);
    }
  }

  return getNoteById(id);
}

export function deleteNote(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM notes_fts WHERE id = ?").run(id);
  db.prepare("DELETE FROM notes WHERE id = ?").run(id);
}

export function searchNotes(
  query: string
): { id: string; title: string; snippet: string }[] {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `SELECT id, title, snippet(notes_fts, 2, '<mark>', '</mark>', '...', 20) as snippet
         FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT 20`
      )
      .all(query + "*") as { id: string; title: string; snippet: string }[];
    return rows;
  } catch {
    const rows = db
      .prepare(
        `SELECT id, title, substr(content, 1, 200) as snippet FROM notes
         WHERE title LIKE ? OR content LIKE ? LIMIT 20`
      )
      .all(`%${query}%`, `%${query}%`) as {
      id: string;
      title: string;
      snippet: string;
    }[];
    return rows;
  }
}

// ── Backlinks ───────────────────────────────────────────────────────────────

export function getBacklinks(noteId: string): { id: string; title: string }[] {
  const db = getDb();
  const note = getNoteById(noteId);
  if (!note) return [];

  const allNotes = db
    .prepare("SELECT id, title, content FROM notes WHERE id != ?")
    .all(noteId) as { id: string; title: string; content: string }[];

  const title = note.title.toLowerCase();
  return allNotes.filter((n) => {
    const content = n.content.toLowerCase();
    return content.includes(`"wikilink"`) && content.includes(title);
  });
}

// ── Settings ────────────────────────────────────────────────────────────────

export function getSettings(): Settings {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM settings WHERE id = 1")
    .get() as Record<string, unknown>;
  return rowToSettings(row);
}

export function updateSettings(data: Partial<Settings>): Settings {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.aiProvider !== undefined) {
    fields.push("ai_provider = ?");
    values.push(data.aiProvider);
  }
  if (data.ollamaUrl !== undefined) {
    fields.push("ollama_url = ?");
    values.push(data.ollamaUrl);
  }
  if (data.ollamaModel !== undefined) {
    fields.push("ollama_model = ?");
    values.push(data.ollamaModel);
  }
  if (data.openaiKey !== undefined && data.openaiKey !== "") {
    fields.push("openai_key = ?");
    values.push(data.openaiKey);
  }
  if (data.openaiModel !== undefined) {
    fields.push("openai_model = ?");
    values.push(data.openaiModel);
  }
  if (data.anthropicKey !== undefined && data.anthropicKey !== "") {
    fields.push("anthropic_key = ?");
    values.push(data.anthropicKey);
  }
  if (data.anthropicModel !== undefined) {
    fields.push("anthropic_model = ?");
    values.push(data.anthropicModel);
  }
  if (data.linkThreshold !== undefined) {
    fields.push("link_threshold = ?");
    values.push(data.linkThreshold);
  }
  if (data.theme !== undefined) {
    fields.push("theme = ?");
    values.push(data.theme);
  }
  if (data.whisperUrl !== undefined) {
    fields.push("whisper_url = ?");
    values.push(data.whisperUrl);
  }

  if (fields.length > 0) {
    db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE id = 1`).run(
      ...values
    );
  }
  return getSettings();
}

// ── Note Links ──────────────────────────────────────────────────────────────

export function upsertNoteLink(data: {
  fromId: string;
  toId: string;
  strength: number;
  matchedConcepts: string[];
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO note_links (id, from_id, to_id, strength, matched_concepts)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(from_id, to_id) DO UPDATE SET
       strength = excluded.strength,
       matched_concepts = excluded.matched_concepts`
  ).run(
    randomUUID(),
    data.fromId,
    data.toId,
    data.strength,
    JSON.stringify(data.matchedConcepts)
  );
}

export function deleteNoteLinksFrom(fromId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM note_links WHERE from_id = ?").run(fromId);
}

export function getAiLinksForNote(
  noteId: string
): { id: string; title: string; strength: number; matchedConcepts: string[] }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT n.id, n.title, nl.strength, nl.matched_concepts
       FROM note_links nl
       JOIN notes n ON (nl.from_id = ? AND nl.to_id = n.id)
                    OR (nl.to_id = ? AND nl.from_id = n.id)
       ORDER BY nl.strength DESC LIMIT 10`
    )
    .all(noteId, noteId) as {
    id: string;
    title: string;
    strength: number;
    matched_concepts: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    strength: r.strength,
    matchedConcepts: JSON.parse(r.matched_concepts || "[]"),
  }));
}

export function getAllNotesKeyPoints(): {
  id: string;
  title: string;
  keyPoints: string[];
}[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, title, key_points FROM notes")
    .all() as { id: string; title: string; key_points: string }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    keyPoints: JSON.parse(r.key_points || "[]"),
  }));
}

// ── Recordings ───────────────────────────────────────────────────────────────

export function createRecording(data: {
  noteId: string;
  filename: string;
  durationSeconds: number;
  transcript: string;
}): Recording {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO recordings (id, note_id, filename, duration_seconds, transcript)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, data.noteId, data.filename, data.durationSeconds, data.transcript);
  return db.prepare("SELECT * FROM recordings WHERE id = ?").get(id) as Recording;
}

export function listRecordingsForNote(noteId: string): Recording[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM recordings WHERE note_id = ? ORDER BY created_at DESC")
    .all(noteId) as Record<string, unknown>[];
  return rows.map(rowToRecording);
}

export function getRecording(id: string): Recording | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM recordings WHERE id = ?")
    .get(id) as Record<string, unknown> | null;
  return row ? rowToRecording(row) : null;
}
