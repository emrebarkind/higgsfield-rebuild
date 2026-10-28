import { describe, expect, test } from 'vitest';
import { createRateLimiter } from '../ratelimit';

describe('createRateLimiter', () => {
  test('allows 10 hits per 60 s, rejects the 11th with a retry time', () => {
    const rl = createRateLimiter({ limit: 10, windowMs: 60_000 });
    for (let i = 0; i < 10; i++) expect(rl.hit('ip', 1000 + i).ok).toBe(true);
    const r = rl.hit('ip', 1010);
    expect(r.ok).toBe(false);
    expect(r.retryAfterS).toBeGreaterThan(0);
  });

  test('allows again once the window has passed', () => {
    const rl = createRateLimiter({ limit: 10, windowMs: 60_000 });
    for (let i = 0; i < 10; i++) rl.hit('ip', 0);
    expect(rl.hit('ip', 59_999).ok).toBe(false);
    expect(rl.hit('ip', 60_000).ok).toBe(true);
  });

  test('keys are independent', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 45_000 });
    expect(rl.hit('a', 0).ok).toBe(true);
    expect(rl.hit('b', 0).ok).toBe(true);
    expect(rl.hit('a', 1).ok).toBe(false);
  });

  test('retryAfterS counts down to the slot that frees first', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 45_000 });
    rl.hit('me', 0);
    expect(rl.hit('me', 13_000).retryAfterS).toBe(32);
  });
});
