"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Recording } from "@/lib/db/queries";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(s: number) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function RecordingsPanel({ noteId }: { noteId: string }) {
  const { data: recordings } = useSWR<Recording[]>(
    `/api/recordings?noteId=${noteId}`,
    fetcher,
    { refreshInterval: 10000 }
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!recordings || recordings.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Recordings ({recordings.length})
      </h3>
      <div className="space-y-3">
        {recordings.map((r) => (
          <div key={r.id} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(r.createdAt)}
                {r.durationSeconds > 0 && ` · ${formatDuration(r.durationSeconds)}`}
              </span>
              {r.transcript && (
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded === r.id ? "Hide transcript" : "Show transcript"}
                </button>
              )}
            </div>
            <audio
              controls
              src={`/api/recordings/${r.id}/audio`}
              className="w-full h-8"
            />
            {expanded === r.id && r.transcript && (
              <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {r.transcript}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
