"use client";

import { useState } from "react";

type Props = {
  noteId: string;
  initialTags: string[];
};

// Editable tag chips under the note title. Tags are also auto-proposed by the
// AI analyze pipeline; this lets the user add/remove them manually.
export function TagBar({ noteId, initialTags }: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const save = async (next: string[]) => {
    setTags(next);
    await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  };

  const addTag = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) save([...tags, t]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-6">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
        >
          #{tag}
          <button
            onClick={() => save(tags.filter((x) => x !== tag))}
            className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            title="Remove tag"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={addTag}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTag();
            if (e.key === "Escape") { setDraft(""); setAdding(false); }
          }}
          placeholder="tag…"
          className="text-xs px-2 py-0.5 rounded-full bg-muted outline-none w-20"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          + tag
        </button>
      )}
    </div>
  );
}
