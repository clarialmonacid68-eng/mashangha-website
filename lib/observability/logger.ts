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
      metadata: redactSecurityMetadata(metadata),
      timestamp: new Date().toISOString(),
    }),
  );
}
