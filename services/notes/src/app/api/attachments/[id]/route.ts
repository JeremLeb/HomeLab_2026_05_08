import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getAttachment } from "@/lib/db/queries";

// Detect SVG by file header bytes — do not trust the client-supplied MIME type.
function isSvgBytes(buf: Buffer): boolean {
  const head = buf.slice(0, 64).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<svg") || head.startsWith("<?xml") || head.includes("<svg");
}

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
  // SVG files can contain embedded scripts — never serve them inline.
  const isSafeInlineImage =
    att.mime.startsWith("image/") && att.mime !== "image/svg+xml" && !isSvgBytes(buf);
  const disposition = isSafeInlineImage
    ? "inline"
    : `attachment; filename="${encodeURIComponent(att.originalName)}"`;
  const contentType = isSafeInlineImage ? att.mime : "application/octet-stream";
  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buf.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
