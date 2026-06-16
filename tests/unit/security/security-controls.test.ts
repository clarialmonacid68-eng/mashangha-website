import { describe, expect, it } from "vitest";

import { createIdempotencyStore } from "@/lib/security/idempotency";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { redactSecurityMetadata } from "@/lib/observability/logger";

describe("security controls", () => {
  it("limits repeated operations in a time window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });

    expect(limiter.check("login:127.0.0.1").allowed).toBe(true);
    expect(limiter.check("login:127.0.0.1").allowed).toBe(true);
    expect(limiter.check("login:127.0.0.1")).toMatchObject({
      allowed: false,
      reason: "RATE_LIMITED",
    });
  });

  it("reuses idempotent results for the same operation key", async () => {
    const store = createIdempotencyStore<string>();
    let calls = 0;

    const first = await store.run("payment:order-1", async () => {
      calls += 1;
      return "created";
    });
    const second = await store.run("payment:order-1", async () => {
      calls += 1;
      return "duplicated";
    });

    expect(first).toBe("created");
    expect(second).toBe("created");
    expect(calls).toBe(1);
  });

  it("redacts secrets, OTPs and signed file URLs from security logs", () => {
    expect(
      redactSecurityMetadata({
        authorization: "Bearer secret-token",
        fileUrl: "https://example.com/file?X-Amz-Signature=abc",
        nested: { otp: "123456", safe: "visible" },
        phone: "+8613800138000",
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      fileUrl: "[REDACTED_URL]",
      nested: { otp: "[REDACTED]", safe: "visible" },
      phone: "+8613800138000",
    });
  });
});
