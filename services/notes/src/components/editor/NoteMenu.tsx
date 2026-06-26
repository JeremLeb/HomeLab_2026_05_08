"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  noteId: string;
  getDoc: () => { title: string; content: string };
  onShowHistory?: () => void;
};

export function NoteMenu({ noteId, getDoc, onShowHistory }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const download = (format: "md" | "html") => {
    window.open(`/api/export/${noteId}?format=${format}`, "_blank");
    setOpen(false);
  };

  const saveAsTemplate = async () => {
    const { title, content } = getDoc();
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Untitled", content, isTemplate: true }),
    });
    setOpen(false);
    alert("Saved as template — available under the ▾ menu in the sidebar.");
  };

  const item = "w-full text-left px-3 py-1.5 text-sm hover:bg-accent";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Note actions"
        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-accent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-popover border border-border rounded-md shadow-lg overflow-hidden py-1">
          <button className={item} onClick={() => download("md")}>Export as Markdown</button>
          <button className={item} onClick={() => download("html")}>Export as HTML</button>
          <div className="my-1 border-t border-border" />
          <button className={item} onClick={saveAsTemplate}>Save as template</button>
          {onShowHistory && (
            <button className={item} onClick={() => { onShowHistory(); setOpen(false); }}>Version history</button>
          )}
        </div>
      )}
    </div>
  );
}
