import { notFound } from "next/navigation";
import { getNoteById } from "@/lib/db/queries";
import { AppShell } from "@/components/layout/AppShell";
import { NoteEditor } from "@/components/editor/NoteEditor";

type Props = { params: Promise<{ id: string }> };

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  const note = getNoteById(id);
  if (!note) notFound();

  return (
    <AppShell>
      <NoteEditor note={note} />
    </AppShell>
  );
}
