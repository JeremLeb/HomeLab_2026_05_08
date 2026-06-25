import { NextResponse } from "next/server";
import { getSettings, createNote } from "@/lib/db/queries";
import { transcribeAudio } from "@/lib/whisper";

export const dynamic = "force-dynamic";

const MAX_AUDIO_SIZE = 200 * 1024 * 1024; // 200 MB

// POST (multipart: audio) → transcribe and create a new note from the text.
export async function POST(req: Request) {
  try {
    const settings = getSettings();
    if (!settings.whisperUrl) {
      return NextResponse.json(
        { error: "No Whisper server configured. Add a Whisper URL in Settings." },
        { status: 503 }
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "audio file too large (max 200MB)" }, { status: 413 });
    }

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    if (!audio) {
      return NextResponse.json({ error: "audio required" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "audio file too large (max 200MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const transcript = await transcribeAudio(settings.whisperUrl, buffer, "voice-note.webm");

    // Title = first few words of the transcript
    const title =
      transcript.split(/\s+/).slice(0, 6).join(" ").slice(0, 60) || "Voice note";

    const content = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: transcript ? [{ type: "text", text: transcript }] : [] },
      ],
    });

    const note = createNote({ title, content });
    return NextResponse.json({ id: note.id, transcript }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
