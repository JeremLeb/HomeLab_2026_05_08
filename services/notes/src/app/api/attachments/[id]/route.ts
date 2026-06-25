import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getAttachment } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const ATTACHMENTS_DIR = path.join(DB_DIR, "attachments");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const att = getAttachment(id);
  if (!att) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filePath = path.join(ATTACHMENTS_DIR, att.filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  const buf = readFileSync(filePath);
  const disposition = att.mime.startsWith("image/")
    ? "inline"
    : `attachment; filename="${encodeURIComponent(att.originalName)}"`;
  return new Response(buf, {
    headers: {
      "Content-Type": att.mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
