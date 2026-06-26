export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AiAdapter {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
  chat(
    messages: AiMessage[],
    onChunk: (delta: string) => void
  ): Promise<void>;
  // Optional: embed text into a vector for semantic search (RAG).
  // Not all providers support embeddings (e.g. Anthropic).
  embed?(text: string): Promise<number[]>;
}
