import { NextResponse } from "next/server";
import { listNotes, createNote } from "@/lib/db/queries";

export async function GET() {
  try {
    const notes = listNotes();
    return NextResponse.json(notes);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      parentId?: string | null;
    };
    const note = createNote({ title: body.title, parentId: body.parentId });
    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
