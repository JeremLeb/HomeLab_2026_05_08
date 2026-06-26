import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getRecording } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const RECORDINGS_DIR = path.join(DB_DIR, "recordings");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recording = getRecording(id);
  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const audioPath = path.join(RECORDINGS_DIR, recording.filename);
  if (!existsSync(audioPath)) {
    return NextResponse.json({ error: "Audio file missing" }, { status: 404 });
  }

  const buf = readFileSync(audioPath);
  return new Response(buf, {
    headers: {
      "Content-Type": "audio/webm",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
