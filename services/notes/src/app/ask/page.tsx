"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

type Citation = { n: number; id: string; title: string };

export default function AskPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setCitations([]);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setAnswer(data.answer || "");
        setCitations(data.citations || []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold mb-2">Ask my notes</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ask a question and get an answer grounded in your notes, with citations.
        </p>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="What did I decide about…?"
            className="flex-1 text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={ask}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>

        {error && (
          <div className="mt-6 text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>
        )}

        {answer && (
          <div className="mt-6">
            <div className="prose-preview whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
            {citations.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Sources
                </div>
                <div className="space-y-1">
                  {citations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/notes/${c.id}`)}
                      className="block text-left text-sm text-[hsl(221_83%_53%)] hover:underline"
                    >
                      [{c.n}] {c.title || "Untitled"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
