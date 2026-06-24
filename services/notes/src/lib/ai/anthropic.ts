import Anthropic from "@anthropic-ai/sdk";
import type { AiAdapter, AiMessage } from "./types";

export class AnthropicAdapter implements AiAdapter {
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const block = res.content[0];
    return block.type === "text" ? block.text : "";
  }

  async chat(
    messages: AiMessage[],
    onChunk: (delta: string) => void
  ): Promise<void> {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system") as {
      role: "user" | "assistant";
      content: string;
    }[];

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 2048,
      system: systemMsg?.content,
      messages: userMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        onChunk(event.delta.text);
      }
    }
  }
}
