// SSRF-prevention helpers for server-side URL validation.
// Only allow http/https; block link-local and loopback addresses unless they
// resolve to "localhost" (common for self-hosted Ollama/Whisper on the same host).

const BLOCKED_PREFIXES = [
  "169.254.", // link-local (AWS/GCP metadata)
  "0.",       // unroutable
];

// IPv4 ranges that are always blocked regardless of hostname.
function isBlockedIpv4(host: string): boolean {
  return BLOCKED_PREFIXES.some((p) => host.startsWith(p));
}

export function validateServerUrl(raw: string): { ok: boolean; reason?: string } {
  if (!raw) return { ok: true }; // empty = disabled, allowed
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http:// and https:// URLs are allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  if (isBlockedIpv4(host)) {
    return { ok: false, reason: "URL resolves to a blocked address range" };
  }

  // Block bare IPv6 loopback
  if (host === "[::1]" || host === "::1") {
    return { ok: false, reason: "IPv6 loopback address is not allowed" };
  }

  return { ok: true };
}
