import { NextResponse } from "next/server";
import { listNotes, getNoteById } from "@/lib/db/queries";
import { tiptapToMarkdown } from "@/lib/export";
import { buildZip } from "@/lib/zip";

export const dynamic = "force-dynamic";

// GET /api/export/all → zip of every note as Markdown.
export async function GET() {
  try {
    const notes = listNotes();
    const used = new Set<string>();
    const files = notes.map((n) => {
      const full = getNoteById(n.id);
      const base = (n.title || "note").replace(/[^a-z0-9-_ ]/gi, "").trim() || "note";
      let name = `${base}.md`;
      let i = 2;
      while (used.has(name.toLowerCase())) {
        name = `${base} (${i++}).md`;
      }
      used.add(name.toLowerCase());
      return { name, content: tiptapToMarkdown(full?.content ?? "{}", n.title) };
    });

    const zip = buildZip(files);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="notes-export.zip"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
