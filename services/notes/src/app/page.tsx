import { redirect } from "next/navigation";
import { listNotes, createNote } from "@/lib/db/queries";

export default function Home() {
  const notes = listNotes();

  if (notes.length === 0) {
    const welcome = createNote({ title: "Welcome to Notes" });
    redirect(`/notes/${welcome.id}`);
  }

  // Redirect to the most recently updated note
  const sorted = [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  redirect(`/notes/${sorted[0].id}`);
}
