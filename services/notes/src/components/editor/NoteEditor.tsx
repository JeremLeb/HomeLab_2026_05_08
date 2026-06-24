"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import type { NoteDetail } from "@/types";
import { EditorToolbar } from "./EditorToolbar";
import { BlockMenu } from "./BlockMenu";
import { BacklinkPanel } from "./BacklinkPanel";
import { AiPanel } from "./AiPanel";
import { WikiLinkExtension } from "./WikiLinkExtension";

const lowlight = createLowlight(common);

type Props = { note: NoteDetail };

export function NoteEditor({ note }: Props) {
  const [title, setTitle] = useState(note.title);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyzeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (data: { title?: string; content?: string }) => {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    [note.id]
  );

  const triggerAnalyze = useCallback(() => {
    if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
    analyzeTimer.current = setTimeout(() => {
      fetch(`/api/ai/analyze/${note.id}`, { method: "POST" }).catch(() => {});
    }, 2000);
  }, [note.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder: "Start writing… type / for blocks" }),
      Link.configure({ openOnClick: false }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }),
      WikiLinkExtension,
    ],
    content: (() => {
      try {
        return JSON.parse(note.content);
      } catch {
        return { type: "doc", content: [] };
      }
    })(),
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        save({ content: JSON.stringify(editor.getJSON()) });
        triggerAnalyze();
      }, 500);
    },
    editorProps: {
      attributes: { class: "prose-editor" },
    },
    immediatelyRender: false,
  });

  // Title autosave
  useEffect(() => {
    const t = setTimeout(() => {
      if (title !== note.title) save({ title });
    }, 500);
    return () => clearTimeout(t);
  }, [title, note.title, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
    };
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-4xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 mb-6 border-none"
          />

          {/* Editor toolbar & content */}
          {editor && (
            <>
              <EditorToolbar editor={editor} onAiPanel={() => setShowAiPanel((v) => !v)} />
              <BlockMenu editor={editor} />
            </>
          )}
          <EditorContent editor={editor} />

          {/* Connections panel */}
          <BacklinkPanel noteId={note.id} />
        </div>
      </div>

      {/* AI Chat panel */}
      {showAiPanel && (
        <AiPanel noteId={note.id} onClose={() => setShowAiPanel(false)} />
      )}
    </div>
  );
}
