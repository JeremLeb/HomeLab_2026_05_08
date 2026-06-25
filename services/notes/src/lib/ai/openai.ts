import OpenAI from "openai";
import type { AiAdapter, AiMessage } from "./types";

export class OpenAiAdapter implements AiAdapter {
  private client: OpenAI;

  constructor(
    apiKey: string,
    private model: string
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const res = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    return res.choices[0]?.message?.content ?? "";
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return res.data[0]?.embedding ?? [];
  }

  async chat(
    messages: AiMessage[],
    onChunk: (delta: string) => void
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) onChunk(delta);
    }
  }
}
