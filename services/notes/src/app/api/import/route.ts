import { NextResponse } from "next/server";
import { createNote } from "@/lib/db/queries";
import { fileToNote, type ImportFile } from "@/lib/import";

export const dynamic = "force-dynamic";

// Accepts files read client-side as text and converts each into a note.
// Body: { files: [{ name, content }], parentId?: string|null }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      files?: ImportFile[];
      parentId?: string | null;
    };
    const files = body.files ?? [];
    if (files.length === 0) {
      return NextResponse.json({ error: "no files" }, { status: 400 });
    }

    const created: { id: string; title: string }[] = [];
    for (const file of files) {
      if (!file?.content) continue;
      const { title, content } = fileToNote(file);
      const note = createNote({ title, content, parentId: body.parentId ?? null });
      created.push({ id: note.id, title: note.title });
    }

    return NextResponse.json({ created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
