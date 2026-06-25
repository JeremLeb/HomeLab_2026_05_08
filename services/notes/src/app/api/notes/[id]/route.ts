import { NextResponse } from "next/server";
import { getNoteById, updateNote, deleteNote } from "@/lib/db/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const note = getNoteById(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = (await req.json()) as {
      title?: string;
      content?: string;
      keyPoints?: string[];
      tags?: string[];
      isTemplate?: boolean;
      status?: string;
      parentId?: string | null;
      position?: number;
    };
    const note = updateNote(id, body);
    if (!note)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(note);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  deleteNote(id);
  return NextResponse.json({ ok: true });
}
