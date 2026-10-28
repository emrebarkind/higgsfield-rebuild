import { describe, expect, test, vi } from 'vitest';
import { PrintError, printPrompt, printWithAI, type PrintClient } from '../print/hf';
import type { Frame } from '../frame';

const frame: Frame = { id: 'f', blob: new Blob([new Uint8Array(4)], { type: 'image/jpeg' }), width: 1536, height: 864, source: 'upload', createdAt: 0 };
type Ev = { type: string; stage?: string; position?: number; message?: string; data?: unknown };

function fakeClient(events: Ev[], opts: { submit?: (endpoint: string, data: unknown) => void; hang?: boolean } = {}) {
  const cancel = vi.fn();
  const client: PrintClient = {
    submit(endpoint, data) {
      opts.submit?.(endpoint, data);
      const it = (async function* () {
        for (const e of events) yield e;
        if (opts.hang) await new Promise(() => {});
      })();
      return Object.assign(it, { cancel });
    },
  };
  return { client, cancel };
}
const video = () => new Response(new Blob([new Uint8Array(16)], { type: 'video/mp4' }), { status: 200 });

describe('printPrompt', () => {
  test('the move sentence, plus the frame prompt when there is one', () => {
    expect(printPrompt('The camera glides toward your subject.')).toBe('The camera glides toward your subject.');
    expect(printPrompt('The camera glides toward your subject.', 'a lake at dawn')).toBe('a lake at dawn. The camera glides toward your subject.');
  });
});

describe('printWithAI', () => {
  test('reports queue position, then running, then done, and returns the video', async () => {
    const submit = vi.fn();
    const { client } = fakeClient(
      [
        { type: 'status', stage: 'pending', position: 3 },
        { type: 'status', stage: 'pending', position: 0 },
        { type: 'status', stage: 'generating' },
        { type: 'data', data: [{ video: { url: 'https://space/file=out.mp4' } }, 42] },
      ],
      { submit },
    );
    const states: string[] = [];
    const blob = await printWithAI(frame, 'a lake. The camera glides.', (s) => states.push(s.position ? `${s.state}:${s.position}` : s.state), undefined, {
      connect: async () => client,
      fetchImpl: vi.fn().mockResolvedValue(video()),
      toFile: (b) => b,
    });
    expect(states).toEqual(['queued:3', 'running', 'running', 'done']);
    expect(blob.type).toBe('video/mp4');
    expect(submit).toHaveBeenCalledWith('/generate_video', expect.objectContaining({ input_image: frame.blob, prompt: 'a lake. The camera glides.', randomize_seed: false }));
  });

  test('a plain file result works too', async () => {
    const { client } = fakeClient([{ type: 'data', data: [{ url: 'https://space/file=out.mp4' }, 1] }]);
    const fetchImpl = vi.fn().mockResolvedValue(video());
    await printWithAI(frame, 'p', () => {}, undefined, { connect: async () => client, fetchImpl, toFile: (b) => b });
    expect(fetchImpl).toHaveBeenCalledWith('https://space/file=out.mp4', expect.anything());
  });

  test('an error status reports failed and rejects without retrying', async () => {
    const { client } = fakeClient([{ type: 'status', stage: 'error', message: 'You have exceeded your ZeroGPU quota. Authenticate with a Hugging Face token for more' }]);
    const connect = vi.fn().mockResolvedValue(client);
    const onStatus = vi.fn();
    const err = await printWithAI(frame, 'p', onStatus, undefined, { connect, toFile: (b) => b }).catch((e) => e);
    expect(err).toBeInstanceOf(PrintError);
    expect(onStatus).toHaveBeenLastCalledWith({ state: 'failed', message: 'You have exceeded your ZeroGPU quota.' });
    expect(connect).toHaveBeenCalledTimes(1);
  });

  test('an unreachable space fails cleanly', async () => {
    const onStatus = vi.fn();
    const err = await printWithAI(frame, 'p', onStatus, undefined, { connect: () => Promise.reject(new Error('down')), toFile: (b) => b }).catch((e) => e);
    expect(err).toBeInstanceOf(PrintError);
    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'failed' }));
  });

  test('aborting cancels the job', async () => {
    const { client, cancel } = fakeClient([{ type: 'status', stage: 'pending', position: 5 }], { hang: true });
    const ctrl = new AbortController();
    const p = printWithAI(frame, 'p', () => {}, ctrl.signal, { connect: async () => client, toFile: (b) => b });
    await new Promise((r) => setTimeout(r, 10));
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalled();
  });
});
