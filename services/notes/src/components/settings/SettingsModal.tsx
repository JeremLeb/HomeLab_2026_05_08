"use client";

import { useState, useEffect } from "react";
import type { SettingsPublic } from "@/types";

type Props = { onClose: () => void };

export function SettingsModal({ onClose }: Props) {
  const [settings, setSettings] = useState<SettingsPublic | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [provider, setProvider] = useState("none");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-haiku-4-5-20251001");
  const [theme, setTheme] = useState("dark");
  const [whisperUrl, setWhisperUrl] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: SettingsPublic) => {
        setSettings(s);
        setProvider(s.aiProvider);
        setOllamaUrl(s.ollamaUrl);
        setOllamaModel(s.ollamaModel);
        setOpenaiModel(s.openaiModel);
        setAnthropicModel(s.anthropicModel);
        setTheme(s.theme);
        setWhisperUrl(s.whisperUrl || "");
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      aiProvider: provider,
      ollamaUrl,
      ollamaModel,
      openaiModel,
      anthropicModel,
      theme,
      whisperUrl,
    };
    if (openaiKey) body.openaiKey = openaiKey;
    if (anthropicKey) body.anthropicKey = anthropicKey;

    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!settings ? (
          <div className="text-center text-muted-foreground py-8">Loading…</div>
        ) : (
          <div className="space-y-6">
            {/* AI Provider */}
            <div>
              <label className="text-sm font-medium mb-2 block">AI Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {(["none", "ollama", "openai", "anthropic"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                      provider === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {p === "none" ? "None" : p === "ollama" ? "Ollama" : p === "openai" ? "OpenAI" : "Anthropic"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ollama config */}
            {provider === "ollama" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Server URL
                  </label>
                  <input
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Model
                  </label>
                  <input
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3"
                    className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* OpenAI config */}
            {provider === "openai" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    API Key {settings.openaiKeySet && "(already set)"}
                  </label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder={settings.openaiKeySet ? "Leave blank to keep existing" : "sk-..."}
                    className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Model
                  </label>
                  <input
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Anthropic config */}
            {provider === "anthropic" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    API Key {settings.anthropicKeySet && "(already set)"}
                  </label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder={settings.anthropicKeySet ? "Leave blank to keep existing" : "sk-ant-..."}
                    className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Model
                  </label>
                  <input
                    value={anthropicModel}
                    onChange={(e) => setAnthropicModel(e.target.value)}
                    placeholder="claude-haiku-4-5-20251001"
                    className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Whisper URL */}
            <div>
              <label className="text-sm font-medium mb-1 block">Whisper Server URL</label>
              <p className="text-xs text-muted-foreground mb-2">
                For meeting transcription. Leave blank if not using recording.
                Example: <code className="font-mono">http://localhost:9000</code>
              </p>
              <input
                value={whisperUrl}
                onChange={(e) => setWhisperUrl(e.target.value)}
                placeholder="http://localhost:9000"
                className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {(["dark", "light", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                      theme === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
