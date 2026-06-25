import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CSRF / cross-origin write protection.
// Reject browser-initiated cross-origin state-changing requests.
// This does NOT block direct API calls (curl, Postman) because those
// don't send an Origin header — it only stops malicious web pages from
// silently POSTing/PATCHing/DELETing via fetch/form from a different origin.
const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function middleware(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();

  // /api/clip has its own per-endpoint CORS handler (bookmarklet use case)
  if (req.nextUrl.pathname.startsWith("/api/clip")) return NextResponse.next();

  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.next(); // direct API call, not a browser CORS request

  const host = req.headers.get("host") ?? "";
  const requestOrigin = new URL(origin);

  // Allow same-origin requests and localhost (dev + self-hosted).
  const isSameHost = requestOrigin.host === host;
  const isLocalhost =
    requestOrigin.hostname === "localhost" ||
    requestOrigin.hostname === "127.0.0.1" ||
    requestOrigin.hostname === "::1";

  if (isSameHost || isLocalhost) return NextResponse.next();

  return NextResponse.json({ error: "Forbidden: cross-origin request" }, { status: 403 });
}

export const config = {
  matcher: "/api/:path*",
};
