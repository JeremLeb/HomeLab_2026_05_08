import { NextResponse } from "next/server";
import { reorderNote } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// Body: { id, parentId, index } — move note under parentId at sibling index.
export async function POST(req: Request) {
  try {
    const { id, parentId, index } = (await req.json()) as {
      id: string;
      parentId: string | null;
      index: number;
    };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    reorderNote(id, parentId ?? null, index ?? 0);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
