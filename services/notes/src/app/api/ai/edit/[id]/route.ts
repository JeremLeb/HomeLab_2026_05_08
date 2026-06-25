import { NextResponse } from "next/server";
import { getAiAdapter } from "@/lib/ai";
import { getNoteById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Takes a free-form instruction plus the note's current text and asks the AI to
// return the full revised note body as constrained HTML, which the client can
// drop straight into the TipTap editor. This is the "AI can modify my notes"
// path — provider-agnostic (no tool-calling required).
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const note = getNoteById(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { instruction } = (await req.json()) as { instruction?: string };
  if (!instruction?.trim()) {
    return NextResponse.json({ error: "instruction required" }, { status: 400 });
  }

  const ai = await getAiAdapter();
  if (!ai) {
    return NextResponse.json({ error: "No AI configured" }, { status: 503 });
  }

  const plainText = note.content
    .replace(/"text":"([^"]*)"/g, "$1")
    .replace(/[{}"\\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  const system =
    "You are a note editor. You rewrite the user's note according to their instruction. " +
    "Return ONLY the full revised note body as clean HTML using these tags: " +
    "<h1> <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <code> <pre> <blockquote>. " +
    "Do not include <html>, <body>, markdown fences, or any commentary — output HTML only.";

  const prompt =
    `Current note title: "${note.title}"\n\n` +
    `Current note content:\n${plainText || "(empty)"}\n\n` +
    `Instruction: ${instruction}\n\n` +
    `Return the full revised note body as HTML.`;

  try {
    let html = (await ai.complete(prompt, system)).trim();
    // Strip accidental markdown code fences around the HTML
    html = html
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return NextResponse.json({ html });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
