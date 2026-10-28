import { describe, expect, test, vi } from 'vitest';
import { createPrintJobs } from '../print/jobs';
import type { PrintStatus } from '../print/hf';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const makeUrl = vi.fn((b: Blob) => `blob:${b.size}`);

describe('print jobs', () => {
  test('a job keeps running and keeps its result with nobody watching', async () => {
    const jobs = createPrintJobs(makeUrl);
    const d = deferred<Blob>();
    let report: (s: PrintStatus) => void = () => {};
    jobs.start('take-1', (onStatus) => {
      report = onStatus;
      return d.promise;
    });
    expect(jobs.get('take-1')).toEqual({ kind: 'working', status: { state: 'queued' } });
    report({ state: 'queued', position: 3 });
    expect(jobs.get('take-1')).toEqual({ kind: 'working', status: { state: 'queued', position: 3 } });
    // the panel that started it is gone (another take focused); the job is not cancelled
    d.resolve(new Blob(['clip']));
    await d.promise;
    await Promise.resolve();
    expect(jobs.get('take-1')).toEqual({ kind: 'done', url: 'blob:4' });
    expect(jobs.get('take-2')).toEqual({ kind: 'idle' });
  });

  test('starting again while one is running does not start a second job', () => {
    const jobs = createPrintJobs(makeUrl);
    const run = vi.fn(() => new Promise<Blob>(() => {}));
    jobs.start('take-1', run);
    jobs.start('take-1', run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('cancel aborts the job and goes back to idle; a failure is kept with its detail', async () => {
    const jobs = createPrintJobs(makeUrl);
    let signal: AbortSignal | undefined;
    jobs.start('take-1', (_s, sig) => {
      signal = sig;
      return new Promise<Blob>((_, reject) => sig.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))));
    });
    jobs.cancel('take-1');
    expect(signal?.aborted).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(jobs.get('take-1')).toEqual({ kind: 'idle' });

    jobs.start('take-2', () => Promise.reject(new Error('quota')));
    await Promise.resolve();
    await Promise.resolve();
    expect(jobs.get('take-2')).toEqual({ kind: 'failed', detail: 'quota' });
  });

  test('subscribers hear every change', async () => {
    const jobs = createPrintJobs(makeUrl);
    const seen = vi.fn();
    jobs.subscribe(seen);
    jobs.start('t', () => Promise.resolve(new Blob(['a'])));
    await Promise.resolve();
    await Promise.resolve();
    expect(seen.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
