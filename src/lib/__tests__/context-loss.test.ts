import { describe, expect, test, vi } from 'vitest';
import { watchContextLoss } from '../render/context';

describe('watchContextLoss', () => {
  test('a lost context is kept restorable and reported; a restore is reported too', () => {
    const canvas = new EventTarget();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const stop = watchContextLoss(canvas, onLost, onRestored);
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true); // without this the browser never restores it
    expect(onLost).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onRestored).toHaveBeenCalledTimes(1);
    stop();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(onLost).toHaveBeenCalledTimes(1);
  });
});
