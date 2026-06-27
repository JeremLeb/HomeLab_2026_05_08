// Whisper transcription client.
//
// Self-hosted Whisper servers do NOT share one API. The three common shapes are:
//   1. onerahmet/openai-whisper-asr-webservice → POST /asr?output=json   field: audio_file
//   2. OpenAI-compatible (faster-whisper-server, speaches, LocalAI, …)
//                                               → POST /v1/audio/transcriptions  field: file (+ model)
//   3. whisper.cpp server                       → POST /inference        field: file
//
// We try them in order until one answers 2xx, so the user only has to paste the
// server's base URL. If they paste a full endpoint URL we honour it directly.

type Endpoint = {
  path: string;
  field: string;
  // extra multipart fields (e.g. OpenAI requires a model)
  extra?: Record<string, string>;
};

const ENDPOINTS: Endpoint[] = [
  { path: "/asr?output=json", field: "audio_file" },
  { path: "/v1/audio/transcriptions", field: "file", extra: { model: "whisper-1" } },
  { path: "/inference", field: "file" },
];

// Parse the various JSON/text response shapes into a transcript string.
async function readTranscript(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const json = (await res.json()) as { text?: string; transcription?: string };
    return (json.text ?? json.transcription ?? "").trim();
  }
  return (await res.text()).trim();
}

function buildForm(endpoint: Endpoint, ab: ArrayBuffer, filename: string): FormData {
  const form = new FormData();
  form.append(endpoint.field, new Blob([ab], { type: "audio/webm" }), filename);
  for (const [k, v] of Object.entries(endpoint.extra ?? {})) form.append(k, v);
  return form;
}

export async function transcribeAudio(
  whisperUrl: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const trimmed = whisperUrl.trim().replace(/\/+$/, "");

  // If the URL already targets a known endpoint, use just that one.
  const direct = ENDPOINTS.find((e) =>
    trimmed.toLowerCase().includes(e.path.split("?")[0].toLowerCase())
  );
  const base = direct
    ? trimmed.replace(new RegExp(direct.path.split("?")[0] + "$", "i"), "")
    : trimmed;
  const candidates = direct ? [direct] : ENDPOINTS;

  const errors: string[] = [];
  for (const endpoint of candidates) {
    let res: Response;
    try {
      res = await fetch(`${base}${endpoint.path}`, {
        method: "POST",
        body: buildForm(endpoint, ab, filename),
      });
    } catch (e) {
      // Network-level failure: record and try the next shape.
      errors.push(`${endpoint.path} → ${(e as Error).message}`);
      continue;
    }
    if (res.ok) return await readTranscript(res);
    // 404/405 → wrong API shape for this server; try the next candidate.
    if (res.status === 404 || res.status === 405) {
      errors.push(`${endpoint.path} → ${res.status}`);
      continue;
    }
    // Any other status means we found the right endpoint but it failed —
    // surface that immediately rather than masking it.
    throw new Error(`Whisper server error ${res.status}: ${await res.text()}`);
  }

  throw new Error(
    `Could not reach a compatible Whisper endpoint at ${base}. ` +
      `Tried: ${errors.join("; ")}. Check the Whisper Server URL in Settings ` +
      `(supports openai-whisper-asr-webservice /asr, OpenAI-compatible ` +
      `/v1/audio/transcriptions, or whisper.cpp /inference).`
  );
}
