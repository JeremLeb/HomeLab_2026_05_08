import type { Editor } from "@tiptap/react";

export type UploadResult = {
  id: string;
  url: string;
  mime: string;
  name: string;
  size: number;
  isImage: boolean;
};

export async function uploadFile(file: File, noteId?: string): Promise<UploadResult | null> {
  const form = new FormData();
  form.append("file", file);
  if (noteId) form.append("noteId", noteId);
  const res = await fetch("/api/attachments", { method: "POST", body: form });
  if (!res.ok) return null;
  return (await res.json()) as UploadResult;
}

// Insert an uploaded file into the editor — image node for images, file chip otherwise.
export function insertUploadedFile(editor: Editor, r: UploadResult) {
  if (r.isImage) {
    editor.chain().focus().setImage({ src: r.url, alt: r.name }).run();
  } else {
    editor.chain().focus().setFileAttachment({ href: r.url, name: r.name, size: r.size }).run();
  }
}
