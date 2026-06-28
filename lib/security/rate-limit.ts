export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: "RATE_LIMITED"; retryAfterMs: number };

export type RateLimiterOptions = {
  limit: number;
  now?: () => number;
  windowMs: number;
};

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  const now = options.now ?? (() => Date.now());

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= currentTime) {
        buckets.set(key, {
          count: 1,
          resetAt: currentTime + options.windowMs,
        });
        return { allowed: true, remaining: options.limit - 1 };
      }

      if (bucket.count >= options.limit) {
        return {
          allowed: false,
          reason: "RATE_LIMITED",
          retryAfterMs: bucket.resetAt - currentTime,
        };
      }

      bucket.count += 1;
      return { allowed: true, remaining: options.limit - bucket.count };
    },
  };
}
