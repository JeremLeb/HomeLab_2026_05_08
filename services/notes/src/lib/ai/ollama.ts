import type { AiAdapter, AiMessage } from "./types";

export class OllamaAdapter implements AiAdapter {
  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = (await res.json()) as { message?: { content: string } };
    return data.message?.content ?? "";
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });
    if (!res.ok) throw new Error(`Ollama embeddings error: ${res.status}`);
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? [];
  }

  async chat(
    messages: AiMessage[],
    onChunk: (delta: string) => void
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split("\n").filter(Boolean)) {
        try {
          const json = JSON.parse(line) as {
            message?: { content: string };
            done?: boolean;
          };
          if (json.message?.content) onChunk(json.message.content);
          if (json.done) return;
        } catch {
          // partial JSON line, skip
        }
      }
    }
  }
}
