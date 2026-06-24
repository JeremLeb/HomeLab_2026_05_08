import { NextResponse } from "next/server";
import { getAiAdapter } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt } = (await req.json()) as {
      prompt: string;
      systemPrompt?: string;
    };

    const ai = await getAiAdapter();
    if (!ai)
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 503 }
      );

    const text = await ai.complete(prompt, systemPrompt);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
