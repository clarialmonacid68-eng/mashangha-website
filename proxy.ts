import { NextResponse, type NextRequest } from "next/server";

import { securityLog } from "@/lib/observability/logger";
import { createRateLimiter } from "@/lib/security/rate-limit";

const writeMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);
const apiWriteLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
const sensitiveWriteLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  return origin === request.nextUrl.origin;
}

function isSameSiteServerAction(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "same-site";
}

function clientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isSensitiveWrite(pathname: string) {
  return [
    "/api/developers/apply",
    "/api/files/sign",
    "/api/orders",
    "/api/payments",
    "/api/quotes",
  ].some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  if (!writeMethods.has(request.method)) {
    return NextResponse.next();
  }

  const isApiWrite = request.nextUrl.pathname.startsWith("/api/");
  const isServerAction = request.headers.has("next-action");

  if (!isApiWrite && !isServerAction) {
    return NextResponse.next();
  }

  if (
    (isApiWrite && !isSameOrigin(request)) ||
    (isServerAction && !isSameOrigin(request) && !isSameSiteServerAction(request))
  ) {
    securityLog("csrf_blocked", {
      method: request.method,
      origin: request.headers.get("origin"),
      pathname: request.nextUrl.pathname,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = `${clientKey(request)}:${request.nextUrl.pathname}`;
  const limiter = isSensitiveWrite(request.nextUrl.pathname)
    ? sensitiveWriteLimiter
    : apiWriteLimiter;
  const result = limiter.check(key);

  if (!result.allowed) {
    securityLog("rate_limited", {
      pathname: request.nextUrl.pathname,
      retryAfterMs: result.retryAfterMs,
    });
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/workspace/:path*", "/admin/:path*"],
};
