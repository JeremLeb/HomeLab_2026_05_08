"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import type { NoteListItem } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Board columns. The empty-string status is the implicit "No status" backlog.
const COLUMNS: { key: string; label: string }[] = [
  { key: "", label: "No status" },
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function BoardPage() {
  const router = useRouter();
  const { data: notes, mutate } = useSWR<NoteListItem[]>("/api/notes", fetcher, {
    refreshInterval: 5000,
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const setStatus = async (id: string, status: string) => {
    // optimistic
    await mutate(
      (cur) => cur?.map((n) => (n.id === id ? { ...n, status } : n)),
      { revalidate: false }
    );
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate();
  };

  const byCol = (key: string) => (notes ?? []).filter((n) => (n.status ?? "") === key);

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        <div className="px-8 py-6 border-b border-border">
          <h1 className="text-2xl font-bold">Board</h1>
          <p className="text-sm text-muted-foreground">Drag notes between columns to set their status.</p>
        </div>
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((col) => {
              const items = byCol(col.key);
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
                  onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
                  onDrop={() => {
                    if (dragId) setStatus(dragId, col.key);
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`w-72 flex-shrink-0 rounded-lg border border-border bg-muted/20 flex flex-col ${
                    overCol === col.key ? "ring-1 ring-[hsl(221_83%_53%)]" : ""
                  }`}
                >
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.map((n) => (
                      <div
                        key={n.id}
                        draggable
                        onDragStart={() => setDragId(n.id)}
                        onClick={() => router.push(`/notes/${n.id}`)}
                        className="bg-card border border-border rounded-md px-3 py-2 text-sm cursor-pointer hover:border-foreground/30 transition-colors"
                      >
                        <div className="font-medium truncate">{n.title || "Untitled"}</div>
                        {n.tags && n.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {n.tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6">Drop notes here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
