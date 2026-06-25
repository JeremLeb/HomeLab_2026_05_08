"use client";

import { useState, useEffect } from "react";

type Version = { id: string; title: string; createdAt: string };

type Props = {
  noteId: string;
  onClose: () => void;
  onRestored: () => void;
};

export function VersionHistory({ noteId, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/versions`)
      .then((r) => r.json())
      .then((v: Version[]) => setVersions(v))
      .finally(() => setLoading(false));
  }, [noteId]);

  const restore = async (vid: string) => {
    if (!confirm("Restore this version? Current content will be saved as a new version first.")) return;
    setRestoring(vid);
    await fetch(`/api/versions/${vid}/restore`, { method: "POST" });
    setRestoring(null);
    onRestored();
    onClose();
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso.replace(" ", "T") + "Z").toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Version history</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : versions.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No saved versions yet. Versions are captured as you edit.
          </div>
        ) : (
          <div className="overflow-y-auto space-y-1">
            {versions.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-sm"
              >
                <div>
                  <div className="font-medium">{i === 0 ? "Most recent" : `Version ${versions.length - i}`}</div>
                  <div className="text-xs text-muted-foreground">{fmt(v.createdAt)}</div>
                </div>
                <button
                  onClick={() => restore(v.id)}
                  disabled={restoring === v.id}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-background disabled:opacity-50"
                >
                  {restoring === v.id ? "Restoring…" : "Restore"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
