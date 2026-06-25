import { NextResponse } from "next/server";
import { getNoteByTitle, createNote } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// Resolves a wiki-link title to a note id. If no note with that title exists,
// one is created (Obsidian-style "click to create"). Returns { id, created }.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string };
    const title = (body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const existing = getNoteByTitle(title);
    if (existing) {
      return NextResponse.json({ id: existing.id, created: false });
    }

    const note = createNote({ title });
    return NextResponse.json({ id: note.id, created: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
