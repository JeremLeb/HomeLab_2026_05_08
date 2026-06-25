import { NextResponse } from "next/server";
import { createNote } from "@/lib/db/queries";
import { htmlToMarkdown, markdownToTiptap } from "@/lib/import";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// POST { title?, url?, html?, text? } → create a note from clipped web content.
// Used by the bookmarklet shown in Settings.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      url?: string;
      html?: string;
      text?: string;
    };

    const title = (body.title || "Web clip").slice(0, 120);
    let md = "";
    if (body.html) md = htmlToMarkdown(body.html);
    else if (body.text) md = body.text;

    if (body.url) md = `> Clipped from ${body.url}\n\n${md}`;

    const doc = markdownToTiptap(md || "_(empty clip)_");
    const note = createNote({ title, content: JSON.stringify(doc) });

    return NextResponse.json({ id: note.id }, { status: 201, headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: CORS });
  }
}
