"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types";

type Action = {
  id: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(0);
  }, []);

  const goDaily = useCallback(async () => {
    const res = await fetch("/api/daily");
    const { id } = (await res.json()) as { id: string };
    router.push(`/notes/${id}`);
  }, [router]);

  const newNote = useCallback(async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { id } = (await res.json()) as { id: string };
    router.push(`/notes/${id}`);
  }, [router]);

  const actions: Action[] = [
    { id: "new", label: "New note", hint: "Create", run: () => { newNote(); close(); } },
    { id: "today", label: "Open today's daily note", hint: "Journal", run: () => { goDaily(); close(); } },
    { id: "graph", label: "Open graph view", hint: "Visualize", run: () => { router.push("/graph"); close(); } },
    { id: "board", label: "Open board (kanban)", hint: "Status", run: () => { router.push("/board"); close(); } },
    { id: "ask", label: "Ask my notes (AI)", hint: "RAG", run: () => { router.push("/ask"); close(); } },
  ];

  // Toggle on Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Debounced note search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setResults((await res.json()) as SearchResult[]);
    }, 200);
  }, [query]);

  const filteredActions = query.trim()
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  // Flat list: actions first, then note results
  const items: { type: "action" | "note"; label: string; hint?: string; run: () => void }[] = [
    ...filteredActions.map((a) => ({ type: "action" as const, label: a.label, hint: a.hint, run: a.run })),
    ...results.map((r) => ({
      type: "note" as const,
      label: r.title || "Untitled",
      hint: "Note",
      run: () => { router.push(`/notes/${r.id}`); close(); },
    })),
  ];

  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={close}
    >
      <div
        className="bg-popover border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes or run a command…"
          className="w-full px-4 py-3 bg-transparent outline-none text-sm border-b border-border"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSelected((v) => Math.min(v + 1, items.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); items[selected]?.run(); }
            else if (e.key === "Escape") { e.preventDefault(); close(); }
          }}
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</div>
          )}
          {items.map((item, i) => (
            <button
              key={`${item.type}-${i}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => item.run()}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                i === selected ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.hint && <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">{item.hint}</span>}
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex gap-3">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
