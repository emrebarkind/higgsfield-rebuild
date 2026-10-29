import { describe, expect, test, vi } from 'vitest';
import { createExportJobs } from '../export/jobs';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

function setup() {
  const makeUrl = vi.fn((b: Blob) => `blob:${b.size}-${b.type}`);
  const revoke = vi.fn();
  const download = vi.fn();
  return { jobs: createExportJobs({ makeUrl, revoke, download }), makeUrl, revoke, download };
}
const spec = { total: 150, aspect: '16:9' as const, height: 1080 as const, name: (webm: boolean) => (webm ? 'take.webm' : 'take.mp4') };

describe('export jobs', () => {
  test('an export keeps running with nobody watching, then downloads once and keeps its link', async () => {
    const { jobs, download } = setup();
    const d = deferred<Blob>();
    let progress: (done: number, total: number) => void = () => {};
    jobs.start('take-1', spec, (onProgress) => {
      progress = onProgress;
      return d.promise;
    });
    expect(jobs.get('take-1')).toEqual({ kind: 'running', done: 0, total: 150, aspect: '16:9', height: 1080 });
    progress(40, 150);
    expect(jobs.get('take-1')).toMatchObject({ kind: 'running', done: 40 });
    // the panel is gone (another take focused); the export is not cancelled
    d.resolve(new Blob(['clip'], { type: 'video/mp4' }));
    await settle();
    expect(jobs.get('take-1')).toEqual({ kind: 'done', url: 'blob:4-video/mp4', name: 'take.mp4', webm: false });
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith('blob:4-video/mp4', 'take.mp4');
    expect(jobs.get('take-2')).toEqual({ kind: 'idle' });
  });

  test('starting again while one runs does not start a second export', () => {
    const { jobs } = setup();
    const run = vi.fn(() => new Promise<Blob>(() => {}));
    jobs.start('take-1', spec, run);
    jobs.start('take-1', spec, run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('cancel goes back to idle; a failure keeps its message', async () => {
    const { jobs, download } = setup();
    jobs.start('take-1', spec, (_p, signal) => new Promise<Blob>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')))));
    jobs.cancel('take-1');
    await settle();
    expect(jobs.get('take-1')).toEqual({ kind: 'idle' });

    jobs.start('take-2', spec, () => Promise.reject(new Error('encoder died')));
    await settle();
    expect(jobs.get('take-2')).toEqual({ kind: 'error', message: 'encoder died' });
    expect(download).not.toHaveBeenCalled();
  });

  test('a new export of the same take frees the old file', async () => {
    const { jobs, revoke } = setup();
    jobs.start('take-1', spec, () => Promise.resolve(new Blob(['a'], { type: 'video/webm' })));
    await settle();
    expect(jobs.get('take-1')).toMatchObject({ kind: 'done', name: 'take.webm', webm: true });
    jobs.start('take-1', spec, () => Promise.resolve(new Blob(['bb'], { type: 'video/mp4' })));
    await settle();
    expect(revoke).toHaveBeenCalledWith('blob:1-video/webm');
    expect(jobs.get('take-1')).toMatchObject({ kind: 'done', url: 'blob:2-video/mp4' });
  });
});
