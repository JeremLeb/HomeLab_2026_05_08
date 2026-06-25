"use client";

import { useState, useRef, useCallback } from "react";
import type { AiMessage } from "@/lib/ai/types";

type Props = {
  noteId: string;
  onClose: () => void;
  // Replace the note body with AI-produced HTML (the "modify my notes" path)
  onApplyHtml: (html: string) => void;
};

type Mode = "ask" | "edit";

const QUICK_EDITS = [
  { label: "Improve writing", instruction: "Improve the writing: clearer, better flow, fix awkward phrasing. Keep the meaning and structure." },
  { label: "Fix grammar", instruction: "Fix all spelling and grammar mistakes. Do not change the meaning or style." },
  { label: "Summarize", instruction: "Rewrite this note as a concise summary with a short intro paragraph and key bullet points." },
  { label: "Make concise", instruction: "Make this note more concise without losing important information." },
  { label: "Add structure", instruction: "Reorganize this note with clear headings, bullet lists, and logical sections." },
  { label: "Continue writing", instruction: "Continue and expand this note, adding relevant detail in the same voice. Keep existing content and append new content." },
];

export function AiPanel({ noteId, onClose, onApplyHtml }: Props) {
  const [mode, setMode] = useState<Mode>("ask");

  // ── Ask (chat) state ──
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Edit state ──
  const [editInstruction, setEditInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [proposedHtml, setProposedHtml] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: AiMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    const assistantMsg: AiMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, noteId }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Error: no AI provider configured. Open Settings to connect one.",
          };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data) as { delta?: string; error?: string };
            if (json.delta) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + json.delta,
                };
                return updated;
              });
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Connection error." };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [input, messages, noteId, streaming]);

  const runEdit = useCallback(
    async (instruction: string) => {
      if (!instruction.trim() || editing) return;
      setEditing(true);
      setProposedHtml(null);
      setEditError(null);
      try {
        const res = await fetch(`/api/ai/edit/${noteId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        });
        const data = (await res.json()) as { html?: string; error?: string };
        if (!res.ok || !data.html) {
          setEditError(
            data.error === "No AI configured"
              ? "No AI provider configured. Open Settings to connect one."
              : data.error || "Could not generate an edit."
          );
          return;
        }
        setProposedHtml(data.html);
      } catch {
        setEditError("Connection error.");
      } finally {
        setEditing(false);
      }
    },
    [noteId, editing]
  );

  return (
    <div className="flex flex-col border-l border-border bg-background" style={{ width: 380 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <span>✦</span> AI Assistant
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-border text-sm">
        <button
          onClick={() => setMode("ask")}
          className={`flex-1 py-2 transition-colors ${
            mode === "ask" ? "text-foreground border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ask
        </button>
        <button
          onClick={() => setMode("edit")}
          className={`flex-1 py-2 transition-colors ${
            mode === "edit" ? "text-foreground border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Edit note
        </button>
      </div>

      {mode === "ask" ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-8">
                Ask anything about this note or get help thinking through ideas.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground rounded-lg px-3 py-2"
                    : "mr-8 text-foreground"
                }`}
              >
                {msg.content || (streaming && i === messages.length - 1 ? "▋" : "")}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask AI… (Enter to send)"
                rows={2}
                className="flex-1 text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring resize-none placeholder:text-muted-foreground"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {streaming ? "…" : "Send"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Tell the AI how to change this note. It will draft a revision you can review and apply.
          </p>

          {/* Quick edits */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EDITS.map((q) => (
              <button
                key={q.label}
                onClick={() => runEdit(q.instruction)}
                disabled={editing}
                className="text-xs border border-border rounded-full px-2.5 py-1 hover:bg-accent disabled:opacity-50 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Free-form instruction */}
          <div className="flex gap-2">
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runEdit(editInstruction);
                }
              }}
              placeholder="e.g. turn this into a checklist…"
              rows={2}
              className="flex-1 text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring resize-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => runEdit(editInstruction)}
              disabled={editing || !editInstruction.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {editing ? "…" : "Draft"}
            </button>
          </div>

          {editError && <p className="text-sm text-red-400">{editError}</p>}

          {editing && (
            <p className="text-sm text-muted-foreground">Drafting a revision…</p>
          )}

          {proposedHtml && (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground bg-muted/30">
                Proposed revision (preview)
              </div>
              <div
                className="p-3 text-sm prose-preview max-h-72 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: proposedHtml }}
              />
              <div className="flex gap-2 p-3 border-t border-border">
                <button
                  onClick={() => {
                    onApplyHtml(proposedHtml);
                    setProposedHtml(null);
                    setEditInstruction("");
                  }}
                  className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  ✓ Apply to note
                </button>
                <button
                  onClick={() => setProposedHtml(null)}
                  className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-accent transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
