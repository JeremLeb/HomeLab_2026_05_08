import { NextResponse } from "next/server";
import { getAiAdapter } from "@/lib/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { createNote, getNoteByTitle } from "@/lib/db/queries";
import { markdownToTiptap } from "@/lib/import";

export const dynamic = "force-dynamic";

// POST { prompt, parentId? } → the AI authors a brand-new note from scratch.
// It returns rich Markdown that may reference other notes with [[Wiki Links]];
// we materialise the main note plus an empty stub for each referenced title so
// the links resolve immediately and show up in the graph.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "local";
  if (!checkRateLimit(ip)) return rateLimitResponse();

  const { prompt, parentId } = (await req.json()) as {
    prompt?: string;
    parentId?: string | null;
  };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const ai = await getAiAdapter();
  if (!ai) {
    return NextResponse.json({ error: "No AI configured" }, { status: 503 });
  }

  const system =
    "You are a knowledgeable note author. Given a request, you write a single, well-developed note in Markdown. " +
    "Be substantial: use a clear structure with headings (##), bullet lists, and detailed paragraphs — not a thin outline. " +
    "Where you mention a distinct related topic that deserves its own note, link it with double brackets like [[Topic Name]]. " +
    "Use 2-6 such [[links]] where natural. " +
    "Reply ONLY with a JSON object: {\"title\": string, \"markdown\": string}. No commentary, no code fences.";

  try {
    const raw = await ai.complete(
      `Write a note for this request:\n\n<request>\n${prompt}\n</request>`,
      system
    );

    let title = "Untitled";
    let markdown = "";
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        const parsed = JSON.parse(objMatch[0]) as { title?: string; markdown?: string };
        if (parsed.title?.trim()) title = parsed.title.trim().slice(0, 120);
        if (parsed.markdown?.trim()) markdown = parsed.markdown;
      } catch {
        /* fall through to raw */
      }
    }
    // Fallback: treat the whole reply as markdown body.
    if (!markdown) markdown = raw.trim();

    const doc = markdownToTiptap(markdown);
    const note = createNote({
      title,
      content: JSON.stringify(doc),
      parentId: parentId ?? null,
    });

    // Materialise stub notes for any [[Wiki Links]] the AI produced so the
    // connections exist right away. Stubs have no body, so they won't pollute
    // AI auto-linking (which requires real content).
    const linked = new Set<string>();
    for (const m of markdown.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const t = m[1].trim();
      if (!t || linked.has(t.toLowerCase())) continue;
      linked.add(t.toLowerCase());
      if (!getNoteByTitle(t)) {
        createNote({ title: t.slice(0, 120), parentId: parentId ?? null });
      }
    }

    return NextResponse.json(
      { id: note.id, title: note.title, linkedTitles: [...linked] },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
