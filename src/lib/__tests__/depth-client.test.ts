import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Frame } from '../frame';

// A stand-in for the depth worker: records requests, lets the test answer or crash.
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  posted: { id: number }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: { id: number }) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
  crash() {
    this.onerror?.({ message: 'boom' } as ErrorEvent);
  }
}

const frame = (id: string): Frame => ({ id, blob: new Blob(['x']), width: 4, height: 3, source: 'upload', createdAt: 0 });
const depth = { width: 1, height: 1, data: new Float32Array([0.5]) };

beforeEach(() => {
  FakeWorker.all = [];
  vi.stubGlobal('Worker', FakeWorker);
  vi.resetModules();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('estimateDepth', () => {
  test('a worker crash rejects the pending read, and a retry starts a fresh worker', async () => {
    const { estimateDepth } = await import('../depth/client');
    const job = estimateDepth(frame('a'), () => {});
    const w1 = FakeWorker.all[0];
    w1.crash();
    await expect(job).rejects.toThrow(/depth/i);
    expect(w1.terminated).toBe(true);

    const retry = estimateDepth(frame('a'), () => {});
    expect(FakeWorker.all).toHaveLength(2);
    const w2 = FakeWorker.all[1];
    w2.reply({ id: w2.posted[0].id, type: 'done', depth });
    await expect(retry).resolves.toBe(depth);
  });

  test('a worker that goes silent times out instead of hanging forever', async () => {
    vi.useFakeTimers();
    const { estimateDepth, DEPTH_IDLE_TIMEOUT_MS } = await import('../depth/client');
    const job = estimateDepth(frame('b'), () => {});
    const settled = expect(job).rejects.toThrow(/took too long/i);
    await vi.advanceTimersByTimeAsync(DEPTH_IDLE_TIMEOUT_MS + 1);
    await settled;
  });

  test('progress messages keep a slow first download alive', async () => {
    vi.useFakeTimers();
    const { estimateDepth, DEPTH_IDLE_TIMEOUT_MS } = await import('../depth/client');
    const job = estimateDepth(frame('c'), () => {});
    const w = FakeWorker.all[0];
    const id = w.posted[0].id;
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(DEPTH_IDLE_TIMEOUT_MS - 1000);
      w.reply({ id, type: 'status', phase: 'download', progress: i / 3 });
    }
    w.reply({ id, type: 'done', depth });
    await expect(job).resolves.toBe(depth);
  });
});
