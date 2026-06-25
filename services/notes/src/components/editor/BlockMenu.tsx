"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";

type BlockItem = {
  label: string;
  description: string;
  action: (editor: Editor) => void;
};

const BLOCKS: BlockItem[] = [
  {
    label: "Heading 1",
    description: "Large section heading",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    description: "Medium section heading",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    description: "Small section heading",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bullet List",
    description: "Unordered list",
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered List",
    description: "Ordered list",
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Task List",
    description: "Checkboxes",
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: "Code Block",
    description: "Syntax highlighted code",
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: "Quote",
    description: "Blockquote",
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Table",
    description: "Insert a table",
    action: (e) =>
      e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    label: "Divider",
    description: "Horizontal rule",
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    label: "Math Block",
    description: "LaTeX equation ($$…$$)",
    action: (e) => e.chain().focus().setBlockMath("e = mc^2").run(),
  },
  {
    label: "Diagram",
    description: "Mermaid flowchart / diagram",
    action: (e) => e.chain().focus().setMermaid("graph TD\n  A[Start] --> B[End]").run(),
  },
  {
    label: "Image / File",
    description: "Upload an image or attach a file",
    action: (e) => {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const { uploadFile, insertUploadedFile } = await import("@/lib/upload");
        const r = await uploadFile(file);
        if (r) insertUploadedFile(e, r);
      };
      input.click();
    },
  },
];

type Props = { editor: Editor };

export function BlockMenu({ editor }: Props) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = BLOCKS.filter((b) =>
    b.label.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setVisible(false);
    setQuery("");
    setSelected(0);
  }, []);

  const apply = useCallback(
    (item: BlockItem) => {
      // Delete the "/" and query text
      const { from } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - query.length - 1, to: from })
        .run();
      item.action(editor);
      close();
    },
    [editor, query, close]
  );

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!visible) return;
      // Use capture phase + stopPropagation so these keys drive the menu
      // instead of moving the editor cursor / inserting newlines.
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelected((v) => Math.min(v + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelected((v) => Math.max(v - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[selected]) apply(filtered[selected]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    // capture: true → runs before ProseMirror's own keydown handler on the editor
    window.addEventListener("keydown", onKeydown, true);
    return () => window.removeEventListener("keydown", onKeydown, true);
  }, [visible, filtered, selected, apply, close]);

  // Keep the highlighted item scrolled into view within the menu
  useEffect(() => {
    if (!visible) return;
    itemRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected, visible]);

  // Watch for "/" at start of a paragraph
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const { from, empty } = editor.state.selection;
      if (!empty) return;
      const text = editor.state.doc.textBetween(
        Math.max(0, from - 30),
        from,
        "\n"
      );
      const match = text.match(/\/([^/\n]*)$/);
      if (match) {
        setQuery(match[1]);
        setSelected(0);
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); };
  }, [editor]);

  if (!visible || filtered.length === 0) return null;

  // Position near cursor
  const coords = editor.view.coordsAtPos(editor.state.selection.from);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
      style={{
        top: coords.bottom + 8,
        left: Math.max(8, coords.left - 8),
        width: 280,
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.label}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 transition-colors ${
            i === selected ? "bg-accent" : "hover:bg-accent/50"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            apply(item);
          }}
        >
          <span className="font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.description}</span>
        </button>
      ))}
    </div>
  );
}
