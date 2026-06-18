type LogMetadata = Record<string, unknown>;

const secretKeyPattern = /authorization|cookie|token|secret|key|otp|code|signature/i;
const signedUrlPattern = /(X-Amz-Signature|signature=|token=|X-Goog-Signature)/i;

export function redactSecurityMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecurityMetadata(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as LogMetadata).map(([key, nested]) => {
        if (secretKeyPattern.test(key)) {
          return [key, "[REDACTED]"];
        }

        if (typeof nested === "string" && signedUrlPattern.test(nested)) {
          return [key, "[REDACTED_URL]"];
        }

        return [key, redactSecurityMetadata(nested)];
      }),
    );
  }

  return value;
}

export function securityLog(event: string, metadata: LogMetadata = {}) {
  console.info(
    JSON.stringify({
      event,
      kind: "security",
      metadata: redactSecurityMetadata(metadata),
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Structured business-event telemetry. Emits one JSON line per key domain event
 * (payment succeeded, refund settled, dispute resolved, ...) so operations can
 * track conversion and funnel health. Swap the console sink for a real provider
 * later without touching call sites.
 */
export function logBusinessEvent(event: string, metadata: LogMetadata = {}) {
  console.info(
    JSON.stringify({
      event,
      kind: "business_event",
      metadata: redactSecurityMetadata(metadata),
      timestamp: new Date().toISOString(),
    }),
  );
}

/** Structured error telemetry with secret redaction. */
export function logError(
  context: string,
  error: unknown,
  metadata: LogMetadata = {},
) {
  console.error(
    JSON.stringify({
      context,
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
      metadata: redactSecurityMetadata(metadata),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }),
  );
}
