import { describe, expect, test } from 'vitest';
import { MAX_BYTES, MAX_EDGE, targetSize, validateFile } from '../frame';
import { pickDepthDevice } from '../depth/client';

const MB = 1024 * 1024;

describe('validateFile', () => {
  test('rejects HEIC and names the accepted types', () => {
    const r = validateFile({ type: 'image/heic', size: 2 * MB });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('JPG, PNG or WebP');
  });

  test('rejects an 11 MB JPEG with the limit and the file size', () => {
    const r = validateFile({ type: 'image/jpeg', size: 11 * MB });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('10 MB');
      expect(r.message).toContain('11.0 MB');
    }
  });

  test('accepts a 2 MB PNG', () => {
    expect(validateFile({ type: 'image/png', size: 2 * MB })).toEqual({ ok: true });
  });

  test('accepts a file of exactly the limit', () => {
    expect(validateFile({ type: 'image/webp', size: MAX_BYTES })).toEqual({ ok: true });
  });
});

describe('targetSize', () => {
  test('downscales a 12 MP phone photo to the long-edge limit, keeping aspect', () => {
    const { width, height } = targetSize(4032, 3024);
    expect(Math.max(width, height)).toBe(MAX_EDGE);
    expect(Math.abs(width / height - 4032 / 3024) * height).toBeLessThan(1);
  });

  test('downscales a portrait photo by its height', () => {
    expect(targetSize(3024, 4032)).toEqual({ width: 1152, height: 1536 });
  });

  test('leaves a small frame unchanged', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  test('honours a custom long edge', () => {
    expect(targetSize(1015, 580, 768)).toEqual({ width: 768, height: 439 });
  });
});

describe('pickDepthDevice', () => {
  test('falls back to wasm without WebGPU', () => {
    expect(pickDepthDevice({ webgpu: false })).toBe('wasm');
  });

  test('uses webgpu when available', () => {
    expect(pickDepthDevice({ webgpu: true })).toBe('webgpu');
  });
});
