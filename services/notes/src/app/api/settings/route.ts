import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/queries";
import type { SettingsPublic } from "@/types";

function toPublic(s: ReturnType<typeof getSettings>): SettingsPublic {
  return {
    aiProvider: s.aiProvider,
    ollamaUrl: s.ollamaUrl,
    ollamaModel: s.ollamaModel,
    openaiKeySet: s.openaiKey !== "",
    openaiModel: s.openaiModel,
    anthropicKeySet: s.anthropicKey !== "",
    anthropicModel: s.anthropicModel,
    linkThreshold: s.linkThreshold,
    theme: s.theme,
  };
}

export async function GET() {
  return NextResponse.json(toPublic(getSettings()));
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const updated = updateSettings(body);
    return NextResponse.json(toPublic(updated));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
