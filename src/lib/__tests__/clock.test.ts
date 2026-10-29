import { describe, expect, test, vi } from 'vitest';
import { createClock } from '../clock';

describe('shared take clock', () => {
  test('subscribers hear each tick without anyone re-rendering', () => {
    const clock = createClock();
    const seen = vi.fn();
    const off = clock.subscribe(seen);
    clock.advance(0.5, 5);
    clock.advance(0.25, 5);
    expect(clock.get()).toBeCloseTo(0.75);
    expect(seen).toHaveBeenCalledTimes(2);
    off();
    clock.advance(0.25, 5);
    expect(seen).toHaveBeenCalledTimes(2);
  });

  test('it loops back to the start after the loop length', () => {
    const clock = createClock();
    clock.set(4.9);
    clock.advance(0.2, 5);
    expect(clock.get()).toBe(0);
  });

  test('set takes a value or an updater, like setState', () => {
    const clock = createClock();
    clock.set(2);
    clock.set((t) => t + 1);
    expect(clock.get()).toBe(3);
  });
});
