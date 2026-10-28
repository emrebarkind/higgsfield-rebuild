import { describe, expect, test, vi } from 'vitest';
import { FrameGenError, frameSize, generateFrame, validatePrompt, type GenClient } from '../framegen';

describe('validatePrompt', () => {
  test('rejects an empty prompt', () => {
    expect(validatePrompt('   ')).toMatch(/describe/i);
  });
  test('rejects more than 500 characters', () => {
    expect(validatePrompt('a'.repeat(501))).toMatch(/500/);
  });
  test('accepts 500 characters', () => {
    expect(validatePrompt('a'.repeat(500))).toBeNull();
  });
});

describe('frameSize', () => {
  test('exact output aspects in multiples of 16, long edge at the frame limit', () => {
    expect(frameSize('16:9')).toEqual({ width: 1536, height: 864 });
    expect(frameSize('9:16')).toEqual({ width: 864, height: 1536 });
    expect(frameSize('1:1')).toEqual({ width: 1152, height: 1152 });
    for (const a of ['16:9', '9:16', '1:1'] as const) {
      const { width, height } = frameSize(a);
      expect(width % 16).toBe(0);
      expect(height % 16).toBe(0);
    }
  });
});

type Msg = { type: 'status'; stage: string; position?: number; message?: string } | { type: 'data'; data: unknown[] };
const fakeClient = (msgs: Msg[], submit = vi.fn()): GenClient => ({
  submit: (endpoint, data) => {
    submit(endpoint, data);
    return (async function* () {
      for (const m of msgs) yield m;
    })();
  },
});
const imageResponse = () => new Response(new Blob([new Uint8Array(8)], { type: 'image/webp' }), { status: 200 });

describe('generateFrame', () => {
  test('validates before connecting', async () => {
    const connect = vi.fn();
    await expect(generateFrame('', '16:9', 1, undefined, { connect })).rejects.toMatchObject({ kind: 'invalid' });
    await expect(generateFrame('a'.repeat(501), '16:9', 1, undefined, { connect })).rejects.toMatchObject({ kind: 'invalid' });
    expect(connect).not.toHaveBeenCalled();
  });

  test('sends the prompt, seed and size, reports the queue, returns the image', async () => {
    const submit = vi.fn();
    const client = fakeClient(
      [
        { type: 'status', stage: 'pending', position: 2 },
        { type: 'data', data: [{ url: 'https://space/file=img.webp' }, 7] },
      ],
      submit,
    );
    const onStatus = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(imageResponse());
    const blob = await generateFrame('  a red car  ', '9:16', 7, onStatus, { connect: async () => client, fetchImpl });
    expect(submit).toHaveBeenCalledWith('/infer', expect.objectContaining({ prompt: 'a red car', seed: 7, randomize_seed: false, width: 864, height: 1536 }));
    expect(onStatus).toHaveBeenCalledWith({ queuePosition: 2 });
    expect(fetchImpl).toHaveBeenCalledWith('https://space/file=img.webp', expect.anything());
    expect(blob.type).toBe('image/webp');
  });

  test('a GPU quota error is a rate-limit error carrying the message', async () => {
    const client = fakeClient([{ type: 'status', stage: 'error', message: 'You have exceeded your free GPU quota. Try again in 0:12:00' }]);
    const err = await generateFrame('a car', '16:9', 1, undefined, { connect: async () => client }).catch((e) => e);
    expect(err).toBeInstanceOf(FrameGenError);
    expect(err.kind).toBe('rate-limited');
    expect(err.message).toMatch(/quota/);
  });

  test('the quota message loses the token advice (Dailies is keyless)', async () => {
    const msg = 'You have exceeded your ZeroGPU quota (90s requested vs. 0s left). Try again in 0:00:00. Authenticate with a Hugging Face token for more quota - https://huggingface.co/settings/tokens';
    const client = fakeClient([{ type: 'status', stage: 'error', message: msg }]);
    const err = await generateFrame('a car', '16:9', 1, undefined, { connect: async () => client }).catch((e) => e);
    expect(err.message).toBe('You have exceeded your ZeroGPU quota (90s requested vs. 0s left). Try again in 0:00:00.');
  });

  test('a space that cannot be reached is an upstream error', async () => {
    const err = await generateFrame('a car', '16:9', 1, undefined, { connect: () => Promise.reject(new Error('offline')) }).catch((e) => e);
    expect(err.kind).toBe('upstream');
  });

  test('a result file that cannot be fetched is an upstream error', async () => {
    const client = fakeClient([{ type: 'data', data: [{ url: 'https://space/x' }] }]);
    const fetchImpl = vi.fn().mockResolvedValue(new Response('gone', { status: 404 }));
    const err = await generateFrame('a car', '16:9', 1, undefined, { connect: async () => client, fetchImpl }).catch((e) => e);
    expect(err.kind).toBe('upstream');
  });

  test('a run that ends without an image is an upstream error', async () => {
    const client = fakeClient([{ type: 'status', stage: 'complete' }]);
    const err = await generateFrame('a car', '16:9', 1, undefined, { connect: async () => client }).catch((e) => e);
    expect(err.kind).toBe('upstream');
  });
});
