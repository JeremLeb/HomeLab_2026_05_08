import { NextResponse } from "next/server";
import { getVersion, getNoteById, updateNote, createVersion } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// Restore a note to a previous version (snapshotting current state first).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ vid: string }> }
) {
  const { vid } = await params;
  const version = getVersion(vid);
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const current = getNoteById(version.noteId);
  if (!current) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  // Snapshot current before restoring so the restore itself is undoable.
  if (current.content) createVersion(current.id, current.title, current.content);

  const updated = updateNote(version.noteId, { content: version.content });
  return NextResponse.json({ ok: true, note: updated });
}
