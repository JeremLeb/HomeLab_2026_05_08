import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type RawNote = { id: string; title: string; content: string };
type RawLink = { from_id: string; to_id: string; strength: number };

function extractWikiLinkTitles(content: string): string[] {
  try {
    const doc = JSON.parse(content);
    const titles: string[] = [];
    const walk = (node: Record<string, unknown>) => {
      if (node.type === "wikiLink" && typeof node.attrs === "object") {
        const attrs = node.attrs as Record<string, unknown>;
        if (typeof attrs.title === "string") titles.push(attrs.title.toLowerCase());
      }
      if (Array.isArray(node.marks)) {
        for (const m of node.marks as Record<string, unknown>[]) walk(m);
      }
      if (Array.isArray(node.content)) {
        for (const c of node.content as Record<string, unknown>[]) walk(c);
      }
    };
    walk(doc);
    return titles;
  } catch {
    return [];
  }
}

export async function GET() {
  const db = getDb();

  const notes = db.prepare("SELECT id, title, content FROM notes").all() as RawNote[];
  const aiLinks = db
    .prepare("SELECT from_id, to_id, strength FROM note_links")
    .all() as RawLink[];

  const titleToId = new Map(notes.map((n) => [n.title.toLowerCase(), n.id]));

  // Build manual wiki-link edges
  const manualEdges = new Set<string>();
  const links: {
    source: string;
    target: string;
    type: "manual" | "ai";
    strength: number;
  }[] = [];

  for (const note of notes) {
    const targets = extractWikiLinkTitles(note.content);
    for (const t of targets) {
      const targetId = titleToId.get(t);
      if (targetId && targetId !== note.id) {
        const key = [note.id, targetId].sort().join(":");
        if (!manualEdges.has(key)) {
          manualEdges.add(key);
          links.push({ source: note.id, target: targetId, type: "manual", strength: 1 });
        }
      }
    }
  }

  // Add AI links (skip if already covered by manual edge)
  for (const l of aiLinks) {
    const key = [l.from_id, l.to_id].sort().join(":");
    if (!manualEdges.has(key)) {
      links.push({ source: l.from_id, target: l.to_id, type: "ai", strength: l.strength });
    }
  }

  const nodes = notes.map((n) => ({
    id: n.id,
    title: n.title,
    linkCount: links.filter((l) => l.source === n.id || l.target === n.id).length,
  }));

  return NextResponse.json({ nodes, links });
}
