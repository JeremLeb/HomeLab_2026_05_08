"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "recording" | "uploading" | "error";

export function VoiceQuickNote() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [msg, setMsg] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => () => clearTimer(), []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.start(500);
      mediaRef.current = mr;
      startRef.current = Date.now();
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    } catch {
      setState("error");
      setMsg("Microphone access denied.");
    }
  }, []);

  const stop = useCallback(() => {
    const mr = mediaRef.current;
    if (!mr) return;
    clearTimer();
    mr.onstop = async () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setState("uploading");
      setMsg("Transcribing…");
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      try {
        const res = await fetch("/api/voice-note", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setMsg(data.error || "Failed.");
          return;
        }
        setOpen(false);
        setState("idle");
        router.push(`/notes/${data.id}`);
      } catch (e) {
        setState("error");
        setMsg(String(e));
      }
    };
    mr.stop();
  }, [router]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <button
        onClick={() => { setOpen(true); setState("idle"); setMsg(""); }}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent"
        title="Voice quick note"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" onClick={() => { if (state !== "recording" && state !== "uploading") setOpen(false); }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xs p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">Voice quick note</h3>
            <div className={`text-4xl font-mono font-bold mb-4 ${state === "recording" ? "text-red-500" : ""}`}>{fmt(elapsed)}</div>
            {msg && <div className={`text-xs mb-3 ${state === "error" ? "text-red-500" : "text-muted-foreground"}`}>{msg}</div>}
            <div className="flex justify-center gap-2">
              {state === "idle" && (
                <button onClick={start} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600">Start</button>
              )}
              {state === "recording" && (
                <button onClick={stop} className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium">Stop & save</button>
              )}
              {state === "uploading" && <div className="text-sm text-muted-foreground animate-pulse">Processing…</div>}
              {(state === "idle" || state === "error") && (
                <button onClick={() => setOpen(false)} className="px-4 py-2 border border-border rounded-full text-sm">Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
