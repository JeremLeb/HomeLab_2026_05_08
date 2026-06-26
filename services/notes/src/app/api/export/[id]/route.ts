import { NextResponse } from "next/server";
import { getNoteById } from "@/lib/db/queries";
import { tiptapToMarkdown, tiptapToHtml } from "@/lib/export";

export const dynamic = "force-dynamic";

// GET /api/export/[id]?format=md|html → download the note in that format.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "md";

  const note = getNoteById(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safeName = (note.title || "note").replace(/[^a-z0-9-_ ]/gi, "").trim() || "note";

  if (format === "html") {
    const html = tiptapToHtml(note.content, note.title);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.html"`,
      },
    });
  }

  const md = tiptapToMarkdown(note.content, note.title);
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.md"`,
    },
  });
}
