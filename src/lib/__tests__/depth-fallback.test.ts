import { describe, expect, test, vi } from 'vitest';
import { createEstimators } from '../depth/fallback';

type Run = (input: string) => Promise<string>;

describe('depth estimator fallback', () => {
  test('an inference error on WebGPU retries once on WASM, and WASM sticks', async () => {
    const gpuRun = vi.fn<Run>(() => Promise.reject(new Error('GPU device lost')));
    const wasmRun = vi.fn<Run>((x) => Promise.resolve(`depth:${x}`));
    const load = vi.fn((device: 'webgpu' | 'wasm') => Promise.resolve(device === 'webgpu' ? gpuRun : wasmRun));
    const est = createEstimators<string, string>(load, () => Promise.resolve(true));
    const devices: string[] = [];
    await expect(est.infer('a', (d) => devices.push(d))).resolves.toEqual({ out: 'depth:a', device: 'wasm' });
    expect(devices).toEqual(['webgpu', 'wasm']);
    await expect(est.infer('b', () => {})).resolves.toEqual({ out: 'depth:b', device: 'wasm' });
    expect(gpuRun).toHaveBeenCalledTimes(1);
    expect(load.mock.calls.map((c) => c[0])).toEqual(['webgpu', 'wasm']);
  });

  test('a WebGPU pipeline that fails to load falls back to WASM', async () => {
    const load = vi.fn((device: 'webgpu' | 'wasm') => (device === 'webgpu' ? Promise.reject(new Error('no fp16')) : Promise.resolve<Run>(async () => 'ok')));
    const est = createEstimators<string, string>(load, () => Promise.resolve(true));
    await expect(est.infer('a', () => {})).resolves.toEqual({ out: 'ok', device: 'wasm' });
  });

  test('a WASM error is reported, and a failed download can be retried', async () => {
    let fails = 1;
    const load = vi.fn(() => (fails-- > 0 ? Promise.reject(new Error('offline')) : Promise.resolve<Run>(() => Promise.reject(new Error('bad image')))));
    const est = createEstimators<string, string>(load, () => Promise.resolve(false));
    await expect(est.infer('a', () => {})).rejects.toThrow('offline');
    await expect(est.infer('a', () => {})).rejects.toThrow('bad image');
    expect(load).toHaveBeenCalledTimes(2);
  });
});
