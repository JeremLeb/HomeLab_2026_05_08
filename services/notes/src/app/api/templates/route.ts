import { NextResponse } from "next/server";
import { listTemplates, createNote, getNoteById } from "@/lib/db/queries";
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

// GET → list available templates (built-ins + user templates).
export async function GET() {
  const userTemplates = listTemplates().map((t) => ({
    id: t.id,
    name: t.title,
    builtin: false,
  }));
  const builtins = BUILTIN_TEMPLATES.map((t) => ({ id: t.id, name: t.name, builtin: true }));
  return NextResponse.json([...builtins, ...userTemplates]);
}

// POST { templateId, parentId? } → create a new note from a template.
export async function POST(req: Request) {
  try {
    const { templateId, parentId } = (await req.json()) as {
      templateId: string;
      parentId?: string | null;
    };

    let title: string;
    let content: string;

    const builtin = getBuiltinTemplate(templateId);
    if (builtin) {
      title = builtin.title;
      content = JSON.stringify(builtin.content);
    } else {
      const tpl = getNoteById(templateId);
      if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });
      title = tpl.title.replace(/^Template:\s*/i, "");
      content = tpl.content;
    }

    const note = createNote({ title, content, parentId: parentId ?? null });
    return NextResponse.json({ id: note.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
