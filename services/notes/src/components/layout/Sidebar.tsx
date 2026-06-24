"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import type { NoteListItem, SearchResult } from "@/types";
import { SidebarPageItem } from "./SidebarPageItem";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsModal } from "@/components/settings/SettingsModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildTree(notes: NoteListItem[]): NoteListItem[] {
  const map = new Map<string, NoteListItem>();
  const roots: NoteListItem[] = [];

  for (const n of notes) {
    map.set(n.id, { ...n, children: [] });
  }

  for (const n of map.values()) {
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children!.push(n);
    } else {
      roots.push(n);
    }
  }

  const sort = (items: NoteListItem[]) => {
    items.sort((a, b) => a.position - b.position);
    items.forEach((i) => sort(i.children ?? []));
    return items;
  };

  return sort(roots);
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: notes, mutate } = useSWR<NoteListItem[]>("/api/notes", fetcher, {
    refreshInterval: 5000,
  });

  const tree = notes ? buildTree(notes) : [];

  const createNote = useCallback(
    async (parentId?: string) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: parentId ?? null }),
      });
      const note = await res.json() as { id: string };
      await mutate();
      router.push(`/notes/${note.id}`);
    },
    [mutate, router]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      await mutate();
      if (pathname === `/notes/${id}`) router.push("/");
    },
    [mutate, router, pathname]
  );

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
      setSearchResults((await res.json()) as SearchResult[]);
    }, 300);
  }, [search]);

  const currentId = pathname?.split("/").pop();

  return (
    <>
      <aside
        className="flex flex-col border-r border-border"
        style={{ width: 260, minWidth: 260 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground/80">Notes</span>
          <button
            onClick={() => createNote()}
            className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="New page"
          >
            + New
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-[236px] bg-popover border border-border rounded-md shadow-lg overflow-hidden">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSearch("");
                    setSearchResults([]);
                    router.push(`/notes/${r.id}`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                >
                  <div className="font-medium truncate">{r.title}</div>
                  {r.snippet && (
                    <div
                      className="text-xs text-muted-foreground truncate mt-0.5"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {tree.map((node) => (
            <SidebarPageItem
              key={node.id}
              node={node}
              depth={0}
              currentId={currentId}
              onNavigate={(id) => router.push(`/notes/${id}`)}
              onCreate={createNote}
              onDelete={deleteNote}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <button
            onClick={() => setShowSettings(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93A10 10 0 0 1 19.07 19.07" />
              <path d="M12 2v2m0 18v2M2 12h2m18 0h2m-3.34-6.66 1.42-1.42M4.93 19.07l-1.42 1.42M19.07 19.07l1.42 1.42M4.93 4.93 3.51 3.51" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
