import { NextResponse } from "next/server";
import { searchNotes } from "@/lib/db/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);
  return NextResponse.json(searchNotes(q));
}
