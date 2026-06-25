import { NextResponse } from "next/server";
import { writeFileSync } from "fs";
import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  getSettings,
  createRecording,
  listRecordingsForNote,
} from "@/lib/db/queries";
import { transcribeAudio } from "@/lib/whisper";
import { getAiAdapter } from "@/lib/ai";

export const dynamic = "force-dynamic";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const RECORDINGS_DIR = path.join(DB_DIR, "recordings");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");
  if (!noteId) {
    return NextResponse.json({ error: "noteId required" }, { status: 400 });
  }
  const recordings = listRecordingsForNote(noteId);
  return NextResponse.json(recordings);
}

export async function POST(req: Request) {
  try {
    const settings = getSettings();

    if (!settings.whisperUrl) {
      return NextResponse.json(
        {
          error:
            "No Whisper server configured. Add a Whisper URL in Settings to enable transcription.",
        },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const noteId = form.get("noteId") as string | null;

    if (!audio || !noteId) {
      return NextResponse.json(
        { error: "audio and noteId required" },
        { status: 400 }
      );
    }

    // Save audio to disk
    mkdirSync(RECORDINGS_DIR, { recursive: true });
    const id = randomUUID();
    const filename = `${id}.webm`;
    const audioPath = path.join(RECORDINGS_DIR, filename);
    const buffer = Buffer.from(await audio.arrayBuffer());
    writeFileSync(audioPath, buffer);

    // Transcribe
    let transcript = "";
    try {
      transcript = await transcribeAudio(settings.whisperUrl, buffer, filename);
    } catch (e) {
      // Still save the recording even if transcription fails
      console.error("Whisper transcription failed:", e);
      transcript = "[Transcription failed]";
    }

    // AI summary (optional — skip if no AI configured)
    let summaryHtml = "";
    const ai = await getAiAdapter();
    if (ai && transcript && transcript !== "[Transcription failed]") {
      try {
        const raw = await ai.complete(
          `Meeting transcript:\n\n${transcript}`,
          `You are a meeting assistant. Given the transcript, produce a concise meeting summary in HTML using only these tags: <h2>, <p>, <ul>, <li>. Structure your output as:
1. A <h2>Summary</h2> followed by a <p> with 2-3 sentences.
2. A <h2>Key Points</h2> with a <ul> of bullet points.
3. A <h2>Action Items</h2> with a <ul> of specific tasks (start each with a verb).
Output only HTML, no markdown fences.`
        );
        summaryHtml = raw
          .replace(/^```html\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
      } catch (e) {
        console.error("AI summary failed:", e);
      }
    }

    // Duration from form (client sends it after recording stops)
    const durationStr = form.get("duration") as string | null;
    const durationSeconds = durationStr ? parseFloat(durationStr) : 0;

    const recording = createRecording({
      noteId,
      filename,
      durationSeconds,
      transcript,
    });

    return NextResponse.json(
      { recordingId: recording.id, transcript, summaryHtml },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
