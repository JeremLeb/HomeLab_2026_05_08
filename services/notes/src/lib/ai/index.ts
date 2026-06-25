import { getSettings } from "@/lib/db/queries";
import type { AiAdapter } from "./types";

export async function getAiAdapter(): Promise<AiAdapter | null> {
  const s = getSettings();
  if (s.aiProvider === "none") return null;

  switch (s.aiProvider) {
    case "ollama": {
      const { OllamaAdapter } = await import("./ollama");
      return new OllamaAdapter(s.ollamaUrl, s.ollamaModel);
    }
    case "openai": {
      if (!s.openaiKey) return null;
      const { OpenAiAdapter } = await import("./openai");
      return new OpenAiAdapter(s.openaiKey, s.openaiModel);
    }
    case "anthropic": {
      if (!s.anthropicKey) return null;
      const { AnthropicAdapter } = await import("./anthropic");
      return new AnthropicAdapter(s.anthropicKey, s.anthropicModel);
    }
    default:
      return null;
  }
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((x) => x.toLowerCase()));
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return intersection.length / union.size;
}

export function getIntersection(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase()));
}
