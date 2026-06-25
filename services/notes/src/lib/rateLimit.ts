// In-memory sliding-window rate limiter for AI endpoints.
// Keyed by IP address; resets the window on each new interval.
// Self-hosted personal app: 30 requests per minute is generous for normal use
// but stops runaway scripts from draining API credits.

const windows = new Map<string, number[]>();

export function checkRateLimit(
  ip: string,
  maxRequests = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (windows.get(ip) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= maxRequests) return false;
  timestamps.push(now);
  windows.set(ip, timestamps);
  return true;
}

export function rateLimitResponse(): Response {
  return Response.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": "60" },
    }
  );
}
