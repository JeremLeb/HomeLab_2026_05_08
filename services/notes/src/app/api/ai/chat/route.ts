import { getAiAdapter } from "@/lib/ai";
import { getNoteById } from "@/lib/db/queries";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import type { AiMessage } from "@/lib/ai/types";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "local";
  if (!checkRateLimit(ip)) return rateLimitResponse();
  try {
    const { messages, noteId } = (await req.json()) as {
      messages: AiMessage[];
      noteId?: string;
    };

    const ai = await getAiAdapter();
    if (!ai) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    let systemPrompt =
      "You are a helpful note-taking assistant. Be concise and helpful.";
    if (noteId) {
      const note = getNoteById(noteId);
      if (note) {
        const plainText = note.content
          .replace(/"text":"([^"]*)"/g, "$1")
          .replace(/[{}"\\[\]]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
        systemPrompt = `You are a helpful assistant. The user is viewing a note titled "${note.title}". Here is its content:\n\n${plainText}\n\nAnswer questions about this note or help the user think through ideas.`;
      }
    }

    const allMessages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          await ai.chat(allMessages, (delta) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(e) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
