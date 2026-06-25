"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import Image from "@tiptap/extension-image";
import { common, createLowlight } from "lowlight";
import type { NoteDetail } from "@/types";
import { EditorToolbar } from "./EditorToolbar";
import { BlockMenu } from "./BlockMenu";
import { EditorContextMenu } from "./EditorContextMenu";
import { BacklinkPanel } from "./BacklinkPanel";
import { AiPanel } from "./AiPanel";
import { MeetingRecorder } from "./MeetingRecorder";
import { RecordingsPanel } from "./RecordingsPanel";
import { NoteMenu } from "./NoteMenu";
import { WikiLinkExtension } from "./WikiLinkExtension";
import { FileAttachmentExtension } from "./FileAttachmentExtension";
import { InlineMath, BlockMath } from "./MathExtension";
import { MermaidExtension } from "./MermaidExtension";
import { uploadFile, insertUploadedFile } from "@/lib/upload";

const lowlight = createLowlight(common);

type Props = { note: NoteDetail };

export function NoteEditor({ note }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyzeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);

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

  // Navigate to a wiki-linked note, creating it if it doesn't exist yet.
  const openWikiLink = useCallback(
    async (title: string) => {
      try {
        const res = await fetch("/api/notes/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id: string };
        router.push(`/notes/${id}`);
      } catch {
        /* ignore */
      }
    },
    [router]
  );

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
      Image.configure({ inline: false, allowBase64: false }),
      WikiLinkExtension,
      FileAttachmentExtension,
      InlineMath,
      BlockMath,
      MermaidExtension,
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
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const file of files) {
            const r = await uploadFile(file, note.id);
            if (r && editorRef.current) insertUploadedFile(editorRef.current, r);
          }
        })();
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const file of files) {
            const r = await uploadFile(file, note.id);
            if (r && editorRef.current) insertUploadedFile(editorRef.current, r);
          }
        })();
        return true;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement | null;
        const el = target?.closest?.("[data-wiki-link]") as HTMLElement | null;
        if (el) {
          const title = el.getAttribute("data-wiki-link");
          if (title) {
            event.preventDefault();
            openWikiLink(title);
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  editorRef.current = editor;

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
          {/* Title row */}
          <div className="relative">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full text-4xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 mb-6 border-none pr-32"
            />
            <div className="absolute top-1 right-0 flex items-center gap-1">
              <button
                onClick={() => setShowAiPanel((v) => !v)}
                title="AI assistant — chat & edit this note"
                className={`transition-colors p-1.5 rounded hover:bg-accent ${
                  showAiPanel ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-base leading-none">✦</span>
              </button>
              <MeetingRecorder
                noteId={note.id}
                onInsertHtml={(html) => {
                  if (!editor) return;
                  editor.commands.insertContent(html);
                  save({ content: JSON.stringify(editor.getJSON()) });
                  triggerAnalyze();
                }}
              />
              <button
                onClick={() => router.push(`/graph?note=${note.id}`)}
                title="Open in graph view"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="2.5" />
                  <circle cx="4.5" cy="5.5" r="2" />
                  <circle cx="19.5" cy="5.5" r="2" />
                  <circle cx="4.5" cy="18.5" r="2" />
                  <circle cx="19.5" cy="18.5" r="2" />
                  <line x1="12" y1="9.5" x2="6" y2="7" />
                  <line x1="12" y1="9.5" x2="18" y2="7" />
                  <line x1="12" y1="14.5" x2="6" y2="17" />
                  <line x1="12" y1="14.5" x2="18" y2="17" />
                </svg>
              </button>
              <NoteMenu
                noteId={note.id}
                getDoc={() => ({
                  title,
                  content: editor ? JSON.stringify(editor.getJSON()) : note.content,
                })}
              />
            </div>
          </div>

          {/* Editor toolbar & content */}
          {editor && (
            <>
              <EditorToolbar editor={editor} onAiPanel={() => setShowAiPanel((v) => !v)} />
              <BlockMenu editor={editor} />
              <EditorContextMenu editor={editor} />
            </>
          )}
          <EditorContent editor={editor} />

          {/* Connections panel */}
          <BacklinkPanel noteId={note.id} />

          {/* Recordings panel */}
          <RecordingsPanel noteId={note.id} />
        </div>
      </div>

      {/* AI Chat panel */}
      {showAiPanel && (
        <AiPanel
          noteId={note.id}
          onClose={() => setShowAiPanel(false)}
          onApplyHtml={(html) => {
            if (!editor) return;
            editor.commands.setContent(html, { emitUpdate: true });
            save({ content: JSON.stringify(editor.getJSON()) });
            triggerAnalyze();
          }}
        />
      )}
    </div>
  );
}
