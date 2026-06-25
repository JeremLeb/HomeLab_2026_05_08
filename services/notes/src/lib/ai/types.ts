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
}
