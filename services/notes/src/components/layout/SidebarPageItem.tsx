"use client";

import { useState, useRef } from "react";
import type { NoteListItem } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  node: NoteListItem;
  depth: number;
  currentId?: string;
  onNavigate: (id: string) => void;
  onCreate: (parentId: string) => void;
  onDelete: (id: string) => void;
};

export function SidebarPageItem({
  node,
  depth,
  currentId,
  onNavigate,
  onCreate,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = node.id === currentId;
  const hasChildren = (node.children?.length ?? 0) > 0;

  const handleRename = async () => {
    if (renameVal.trim() && renameVal !== node.title) {
      await fetch(`/api/notes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameVal.trim() }),
      });
    }
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md mx-1 my-0.5 text-sm cursor-pointer select-none",
          "hover:bg-accent/60 transition-colors",
          isActive && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: 4 }}
      >
        {/* Expand toggle */}
        <button
          className={cn(
            "flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground",
            !hasChildren && "opacity-0 pointer-events-none"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            className={cn("transition-transform", expanded && "rotate-90")}
          >
            <path d="M3 2l4 3-4 3V2z" />
          </svg>
        </button>

        {/* Title */}
        {renaming ? (
          <input
            ref={inputRef}
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm py-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 truncate py-1.5 text-sm"
            onClick={() => onNavigate(node.id)}
            onDoubleClick={() => setRenaming(true)}
          >
            {node.title || "Untitled"}
          </span>
        )}

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="Add subpage"
            onClick={(e) => {
              e.stopPropagation();
              onCreate(node.id);
              setExpanded(true);
            }}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${node.title}"?`)) onDelete(node.id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-accent"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <SidebarPageItem
              key={child.id}
              node={child}
              depth={depth + 1}
              currentId={currentId}
              onNavigate={onNavigate}
              onCreate={onCreate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
