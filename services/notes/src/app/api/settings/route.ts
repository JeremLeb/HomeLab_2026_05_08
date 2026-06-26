import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/queries";
import { validateServerUrl } from "@/lib/security";
import type { SettingsPublic } from "@/types";

// Strip any credentials (user:pass@) from a URL before returning it to clients.
function redactUrlCredentials(url: string): string {
  try {
    const u = new URL(url);
    u.username = "";
    u.password = "";
    return u.toString();
  } catch {
    return url;
  }
}

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
    whisperUrl: redactUrlCredentials(s.whisperUrl),
  };
}

export async function GET() {
  return NextResponse.json(toPublic(getSettings()));
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // Validate server URLs before persisting to prevent SSRF.
    for (const field of ["ollamaUrl", "whisperUrl"] as const) {
      if (body[field] !== undefined) {
        const check = validateServerUrl(String(body[field]));
        if (!check.ok) {
          return NextResponse.json(
            { error: `Invalid ${field}: ${check.reason}` },
            { status: 400 }
          );
        }
      }
    }

    const updated = updateSettings(body);
    return NextResponse.json(toPublic(updated));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
