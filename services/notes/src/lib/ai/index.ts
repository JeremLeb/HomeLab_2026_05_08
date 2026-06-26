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

// Generic words that carry no topical signal — if two notes only "share" these,
// they are not actually related. Prevents spurious links between unrelated notes.
const STOPWORDS = new Set([
  "note", "notes", "page", "text", "content", "document", "section", "topic",
  "idea", "ideas", "thing", "things", "stuff", "general", "misc", "other",
  "untitled", "todo", "task", "tasks", "list", "item", "items", "info",
]);

// Normalise a raw key-concept list into clean, comparable tokens:
// trim, lowercase, drop blanks / too-short / pure-punctuation / stopwords,
// and de-duplicate. This is the gatekeeper that stops "empty space" concepts
// from being treated as linkable signal.
export function cleanConcepts(concepts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of concepts) {
    if (typeof raw !== "string") continue;
    const c = raw.trim().toLowerCase();
    if (c.length < 3) continue; // blanks + 1-2 char tokens
    if (!/[a-z0-9]/.test(c)) continue; // pure punctuation/whitespace
    if (STOPWORDS.has(c)) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(cleanConcepts(a));
  const setB = new Set(cleanConcepts(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return union.size ? intersection.length / union.size : 0;
}

export function getIntersection(a: string[], b: string[]): string[] {
  const setB = new Set(cleanConcepts(b));
  return cleanConcepts(a).filter((x) => setB.has(x));
}
