"use client";

import { useState, useRef, useCallback } from "react";
import type { AiMessage } from "@/lib/ai/types";

type Props = {
  noteId: string;
  onClose: () => void;
};

export function AiPanel({ noteId, onClose }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        body: JSON.stringify({
          messages: newMessages,
          noteId,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Error: could not get response.",
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
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Connection error.",
          };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [input, messages, noteId, streaming]);

  return (
    <div className="flex flex-col border-l border-border bg-background" style={{ width: 360 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <span>✦</span> AI Assistant
        </span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask anything about this note or get help writing.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${
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
    </div>
  );
}
