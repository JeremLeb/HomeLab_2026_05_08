import { NextResponse } from "next/server";
import { getAiAdapter, jaccardSimilarity, getIntersection } from "@/lib/ai";
import {
  getNoteById,
  updateNote,
  getAllNotesKeyPoints,
  upsertNoteLink,
  deleteNoteLinksFrom,
  getSettings,
} from "@/lib/db/queries";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;

  const note = getNoteById(id);
  if (!note)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ai = await getAiAdapter();
  if (!ai)
    return NextResponse.json({ error: "No AI configured" }, { status: 503 });

  const plainText = note.content
    .replace(/"text":"([^"]*)"/g, "$1")
    .replace(/[{}"\\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  if (plainText.length < 30)
    return NextResponse.json({ keyPoints: note.keyPoints });

  try {
    const response = await ai.complete(
      `Extract exactly 8 short key concepts or topics from this text. Reply ONLY with a JSON array of strings, no explanation.\n\nText:\n${plainText}`,
      "You extract key concepts. Reply only with a valid JSON array of strings."
    );

    let keyPoints: string[] = [];
    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        keyPoints = JSON.parse(match[0]) as string[];
        keyPoints = keyPoints
          .filter((k) => typeof k === "string")
          .slice(0, 10);
      } catch {
        keyPoints = [];
      }
    }

    if (keyPoints.length > 0) {
      updateNote(id, { keyPoints });

      // Auto-link: compute similarity vs all other notes.
      // Stricter rules to avoid spurious links (e.g. a near-empty note sharing
      // one or two generic concepts with a full note):
      //   - both notes must have at least MIN_KEYPOINTS concepts
      //   - they must share at least MIN_SHARED concepts
      //   - Jaccard score must clear the configured threshold
      const MIN_KEYPOINTS = 3;
      const MIN_SHARED = 2;

      const settings = getSettings();
      const threshold = settings.linkThreshold;
      const allNotes = getAllNotesKeyPoints().filter((n) => n.id !== id);

      deleteNoteLinksFrom(id);

      // Skip linking entirely for sparse notes — they produce noisy matches.
      if (keyPoints.length >= MIN_KEYPOINTS) {
        for (const other of allNotes) {
          if (other.keyPoints.length < MIN_KEYPOINTS) continue;

          const matched = getIntersection(keyPoints, other.keyPoints);
          if (matched.length < MIN_SHARED) continue;

          const score = jaccardSimilarity(keyPoints, other.keyPoints);
          if (score < threshold) continue;

          upsertNoteLink({
            fromId: id,
            toId: other.id,
            strength: score,
            matchedConcepts: matched,
          });
        }
      }
    }

    return NextResponse.json({ keyPoints });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
