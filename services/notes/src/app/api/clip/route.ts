import { NextResponse } from "next/server";
import { createNote } from "@/lib/db/queries";
import { htmlToMarkdown, markdownToTiptap } from "@/lib/import";

export const dynamic = "force-dynamic";

// Build CORS headers that only allow localhost origins (for the bookmarklet).
// The bookmarklet runs in the user's browser so its Origin is the page being
// clipped — we allow any origin only when the request comes from localhost/LAN.
function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    !origin ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.") ||
    origin.startsWith("http://[::1]");
  return {
    "Access-Control-Allow-Origin": allowed ? (origin || "*") : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

// POST { title?, url?, html?, text? } → create a note from clipped web content.
// Used by the bookmarklet shown in Settings.
export async function POST(req: Request) {
  const hdrs = corsHeaders(req);
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

    return NextResponse.json({ id: note.id }, { status: 201, headers: hdrs });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: hdrs });
  }
}
