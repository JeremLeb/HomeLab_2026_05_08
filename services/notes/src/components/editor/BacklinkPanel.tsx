"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type ConnectionData = {
  manual: { id: string; title: string }[];
  ai: {
    id: string;
    title: string;
    strength: number;
    matchedConcepts: string[];
  }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function BacklinkPanel({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  const { data } = useSWR<ConnectionData>(
    `/api/backlinks/${noteId}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const manual = data?.manual ?? [];
  const ai = data?.ai ?? [];
  const total = manual.length + ai.length;

  if (total === 0 && !data) return null;
  if (total === 0) return null;

  return (
    <div className="mt-16 border-t border-border pt-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path d="M3 2l4 3-4 3V2z" />
        </svg>
        <span>Connections ({total})</span>
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Manual backlinks */}
          {manual.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                Backlinks
              </p>
              <div className="space-y-1">
                {manual.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => router.push(`/notes/${n.id}`)}
                    className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <span className="text-muted-foreground">→</span>
                    {n.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI discovered links */}
          {ai.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <span>✦</span> AI Discovered
              </p>
              <div className="space-y-2">
                {ai.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => router.push(`/notes/${n.id}`)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          n.strength >= 0.5
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <div>
                        <span className="text-sm text-blue-500 group-hover:text-blue-400 transition-colors">
                          {n.title}
                        </span>
                        {n.matchedConcepts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {n.matchedConcepts.slice(0, 4).map((c) => (
                              <span
                                key={c}
                                className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
