import { NextResponse } from "next/server";
import { getNoteByTitle, createNote } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const JOURNAL_TITLE = "Journal";

// Pretty title for a daily note, e.g. "June 25, 2026".
function dailyTitle(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getOrCreateJournal(): string {
  let journal = getNoteByTitle(JOURNAL_TITLE);
  if (!journal) journal = createNote({ title: JOURNAL_TITLE });
  return journal.id;
}

// GET /api/daily?date=YYYY-MM-DD → get-or-create that day's note. Defaults to today.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const title = dailyTitle(date);

  const existing = getNoteByTitle(title);
  if (existing) return NextResponse.json({ id: existing.id, created: false });

  const journalId = getOrCreateJournal();
  const note = createNote({
    title,
    parentId: journalId,
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] },
        { type: "paragraph" },
      ],
    }),
  });
  return NextResponse.json({ id: note.id, created: true });
}

export async function POST(req: Request) {
  return GET(req);
}
