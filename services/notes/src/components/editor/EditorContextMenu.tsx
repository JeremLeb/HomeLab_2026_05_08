"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";

type MenuItem =
  | { type: "action"; label: string; run: () => void; danger?: boolean }
  | { type: "separator"; key: string }
  | { type: "label"; text: string };

type Props = { editor: Editor };

export function EditorContextMenu({ editor }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setPos(null), []);

  // Open on right-click inside the editor
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // Move the selection to the click point so commands act where the user clicked
      const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (coords) {
        editor.commands.focus();
        editor.commands.setTextSelection(coords.pos);
      }
      setPos({ x: e.clientX, y: e.clientY });
    };
    dom.addEventListener("contextmenu", onContextMenu);
    return () => dom.removeEventListener("contextmenu", onContextMenu);
  }, [editor]);

  // Close on outside click / escape / scroll
  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos, close]);

  if (!pos) return null;

  const inTable = editor.isActive("table");
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const items: MenuItem[] = [];

  if (inTable) {
    items.push({ type: "label", text: "Table" });
    items.push({
      type: "action",
      label: "Insert row above",
      run: run(() => editor.chain().focus().addRowBefore().run()),
    });
    items.push({
      type: "action",
      label: "Insert row below",
      run: run(() => editor.chain().focus().addRowAfter().run()),
    });
    items.push({
      type: "action",
      label: "Insert column left",
      run: run(() => editor.chain().focus().addColumnBefore().run()),
    });
    items.push({
      type: "action",
      label: "Insert column right",
      run: run(() => editor.chain().focus().addColumnAfter().run()),
    });
    items.push({ type: "separator", key: "t1" });
    items.push({
      type: "action",
      label: "Toggle header row",
      run: run(() => editor.chain().focus().toggleHeaderRow().run()),
    });
    items.push({
      type: "action",
      label: "Merge / split cells",
      run: run(() => editor.chain().focus().mergeOrSplit().run()),
    });
    items.push({ type: "separator", key: "t2" });
    items.push({
      type: "action",
      label: "Delete row",
      run: run(() => editor.chain().focus().deleteRow().run()),
      danger: true,
    });
    items.push({
      type: "action",
      label: "Delete column",
      run: run(() => editor.chain().focus().deleteColumn().run()),
      danger: true,
    });
    items.push({
      type: "action",
      label: "Delete table",
      run: run(() => editor.chain().focus().deleteTable().run()),
      danger: true,
    });
  } else {
    items.push({ type: "label", text: "Insert" });
    items.push({
      type: "action",
      label: "Table",
      run: run(() =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      ),
    });
    items.push({
      type: "action",
      label: "Code block",
      run: run(() => editor.chain().focus().toggleCodeBlock().run()),
    });
    items.push({
      type: "action",
      label: "Quote",
      run: run(() => editor.chain().focus().toggleBlockquote().run()),
    });
    items.push({
      type: "action",
      label: "Divider",
      run: run(() => editor.chain().focus().setHorizontalRule().run()),
    });
    items.push({ type: "separator", key: "g1" });
    items.push({ type: "label", text: "Turn into" });
    items.push({
      type: "action",
      label: "Heading 1",
      run: run(() => editor.chain().focus().toggleHeading({ level: 1 }).run()),
    });
    items.push({
      type: "action",
      label: "Heading 2",
      run: run(() => editor.chain().focus().toggleHeading({ level: 2 }).run()),
    });
    items.push({
      type: "action",
      label: "Bullet list",
      run: run(() => editor.chain().focus().toggleBulletList().run()),
    });
    items.push({
      type: "action",
      label: "Task list",
      run: run(() => editor.chain().focus().toggleTaskList().run()),
    });
  }

  // Keep the menu on-screen
  const MENU_W = 220;
  const left = Math.min(pos.x, window.innerWidth - MENU_W - 8);
  const top = Math.min(pos.y, window.innerHeight - items.length * 30 - 16);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl py-1 text-sm"
      style={{ top, left, width: MENU_W }}
    >
      {items.map((item, i) => {
        if (item.type === "separator")
          return <div key={item.key} className="h-px bg-border my-1" />;
        if (item.type === "label")
          return (
            <div
              key={`label-${i}`}
              className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground"
            >
              {item.text}
            </div>
          );
        return (
          <button
            key={`${item.label}-${i}`}
            onMouseDown={(e) => {
              e.preventDefault();
              item.run();
            }}
            className={`w-full text-left px-3 py-1.5 transition-colors hover:bg-accent ${
              item.danger ? "text-red-400 hover:text-red-300" : "text-foreground"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
