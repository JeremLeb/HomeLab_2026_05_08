// Client for the onerahmet/openai-whisper-asr-webservice API.
// POST multipart to ${whisperUrl}/asr?output=json with an audio_file field.

export async function transcribeAudio(
  whisperUrl: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const form = new FormData();
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  form.append("audio_file", new Blob([ab], { type: "audio/webm" }), filename);

  const base = whisperUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/asr?output=json`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Whisper server error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}
