"use client";

import { useState, useEffect, useRef } from "react";

type Template = { id: string; name: string; builtin: boolean };

export function TemplateMenu({ onCreate }: { onCreate: (templateId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && templates.length === 0) {
      fetch("/api/templates")
        .then((r) => r.json())
        .then((t: Template[]) => setTemplates(t));
    }
  }, [open, templates.length]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="New from template"
      >
        ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-popover border border-border rounded-md shadow-lg overflow-hidden py-1">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            New from template
          </div>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onCreate(t.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
            >
              <span className="truncate">{t.name || "Untitled"}</span>
              {!t.builtin && <span className="text-[10px] text-muted-foreground">custom</span>}
            </button>
          ))}
          {templates.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
          )}
        </div>
      )}
    </div>
  );
}
