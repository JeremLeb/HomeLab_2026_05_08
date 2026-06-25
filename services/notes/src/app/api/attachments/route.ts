import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createAttachment } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const ATTACHMENTS_DIR = path.join(DB_DIR, "attachments");

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

// Upload a file (image or any file). Returns { id, url, mime, name, isImage }.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const noteId = (form.get("noteId") as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "file too large (max 25MB)" }, { status: 413 });
    }

    mkdirSync(ATTACHMENTS_DIR, { recursive: true });
    const id = randomUUID();
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = `${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(path.join(ATTACHMENTS_DIR, filename), buffer);

    const mime = file.type || "application/octet-stream";
    createAttachment({
      id,
      noteId,
      filename,
      originalName: file.name,
      mime,
      size: file.size,
    });

    return NextResponse.json(
      {
        id,
        url: `/api/attachments/${id}`,
        mime,
        name: file.name,
        size: file.size,
        isImage: mime.startsWith("image/"),
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
