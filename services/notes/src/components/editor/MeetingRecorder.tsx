"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type State = "idle" | "recording" | "paused" | "uploading" | "done" | "error";

type Props = {
  noteId: string;
  onInsertHtml: (html: string) => void;
};

export function MeetingRecorder({ noteId, onInsertHtml }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(500);
      mediaRef.current = mr;
      startTimeRef.current = Date.now();
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      setState("error");
      setStatusMsg("Microphone access denied.");
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.pause();
      clearTimer();
      setState("paused");
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRef.current?.state === "paused") {
      mediaRef.current.resume();
      setState("recording");
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  }, []);

  const stopAndUpload = useCallback(() => {
    const mr = mediaRef.current;
    if (!mr) return;
    clearTimer();

    const duration = elapsed;
    mr.onstop = async () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });

      setState("uploading");
      setStatusMsg("Transcribing…");

      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("noteId", noteId);
      form.append("duration", String(duration));

      try {
        const res = await fetch("/api/recordings", { method: "POST", body: form });
        const data = (await res.json()) as {
          recordingId?: string;
          transcript?: string;
          summaryHtml?: string;
          error?: string;
        };

        if (!res.ok) {
          setState("error");
          setStatusMsg(data.error || "Upload failed.");
          return;
        }

        setTranscript(data.transcript || "");

        if (data.summaryHtml) {
          setStatusMsg("Inserting summary…");
          // Wrap transcript in a collapsible details block
          const transcriptBlock = data.transcript
            ? `<p><em>Full transcript:</em> ${data.transcript}</p>`
            : "";
          onInsertHtml(data.summaryHtml + transcriptBlock);
        } else if (data.transcript) {
          onInsertHtml(`<p><strong>Meeting Transcript:</strong></p><p>${data.transcript}</p>`);
        }

        setState("done");
        setStatusMsg("Done! Summary inserted into note.");
      } catch (e) {
        setState("error");
        setStatusMsg(String(e));
      }
    };
    mr.stop();
  }, [elapsed, noteId, onInsertHtml]);

  const reset = () => {
    setState("idle");
    setElapsed(0);
    setStatusMsg("");
    setTranscript("");
    setShowTranscript(false);
    mediaRef.current = null;
    chunksRef.current = [];
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); reset(); }}
        title="Record meeting"
        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-accent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Meeting Recorder</h3>
          <button
            onClick={() => { setOpen(false); reset(); if (mediaRef.current?.state !== "inactive") mediaRef.current?.stop(); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Timer */}
        <div className="text-center my-6">
          <div className={`text-5xl font-mono font-bold tabular-nums ${state === "recording" ? "text-red-500" : "text-foreground"}`}>
            {formatTime(elapsed)}
          </div>
          {state === "recording" && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-red-500">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording
            </div>
          )}
          {state === "paused" && (
            <div className="mt-2 text-xs text-muted-foreground">Paused</div>
          )}
          {(state === "uploading" || state === "done" || state === "error") && (
            <div className={`mt-2 text-xs ${state === "error" ? "text-red-500" : "text-muted-foreground"}`}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {state === "idle" && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Start Recording
            </button>
          )}
          {state === "recording" && (
            <>
              <button
                onClick={pauseRecording}
                className="px-4 py-2 border border-border rounded-full text-sm hover:bg-accent transition-colors"
              >
                Pause
              </button>
              <button
                onClick={stopAndUpload}
                className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Stop & Transcribe
              </button>
            </>
          )}
          {state === "paused" && (
            <>
              <button
                onClick={resumeRecording}
                className="px-4 py-2 border border-border rounded-full text-sm hover:bg-accent transition-colors"
              >
                Resume
              </button>
              <button
                onClick={stopAndUpload}
                className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Stop & Transcribe
              </button>
            </>
          )}
          {state === "uploading" && (
            <div className="text-sm text-muted-foreground animate-pulse">Processing…</div>
          )}
          {(state === "done" || state === "error") && (
            <button
              onClick={() => { setOpen(false); reset(); }}
              className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          )}
        </div>

        {/* Transcript preview */}
        {state === "done" && transcript && (
          <div className="mt-4">
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>
            {showTranscript && (
              <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                {transcript}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
