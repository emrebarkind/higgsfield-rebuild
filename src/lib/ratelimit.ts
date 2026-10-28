// Sliding-window limiter: at most `limit` hits per `windowMs` per key.

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    hit(key: string, now = Date.now()): { ok: boolean; retryAfterS: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length < limit) {
        recent.push(now);
        hits.set(key, recent);
        return { ok: true, retryAfterS: 0 };
      }
      hits.set(key, recent);
      return { ok: false, retryAfterS: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
    },
  };
}
