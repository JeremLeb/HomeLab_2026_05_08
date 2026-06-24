import { NextResponse } from "next/server";
import { getBacklinks, getAiLinksForNote } from "@/lib/db/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const manual = getBacklinks(id);
  const ai = getAiLinksForNote(id);
  return NextResponse.json({ manual, ai });
}
