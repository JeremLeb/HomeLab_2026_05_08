"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { cn } from "@/lib/utils";

type Props = {
  editor: Editor;
  onAiPanel: () => void;
};

type BtnProps = {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
};

function Btn({ active, onClick, title, children }: BtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "px-2 py-1 text-xs rounded transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, onAiPanel }: Props) {
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg p-1 z-50"
    >
      <Btn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </Btn>
      <Btn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </Btn>
      <Btn
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        {"</>"}
      </Btn>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Btn
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        H1
      </Btn>
      <Btn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </Btn>
      <Btn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        H3
      </Btn>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Btn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        &ldquo;
      </Btn>
      <div className="w-px h-4 bg-border mx-0.5" />
      {/* AI action button */}
      <Btn onClick={onAiPanel} title="AI actions">
        ✦
      </Btn>
    </BubbleMenu>
  );
}
