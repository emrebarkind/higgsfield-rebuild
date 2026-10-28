import { describe, expect, test } from 'vitest';
import { createSingleFlight, exportFileName, exportSize, frameCount, pickExportPath } from '../export/mp4';

describe('pickExportPath', () => {
  test('prefers WebCodecs MP4', () => {
    expect(pickExportPath({ videoEncoder: true, mediaRecorder: true })).toBe('webcodecs-mp4');
  });
  test('falls back to MediaRecorder WebM', () => {
    expect(pickExportPath({ videoEncoder: false, mediaRecorder: true })).toBe('mediarecorder-webm');
  });
  test('null when the browser can do neither', () => {
    expect(pickExportPath({ videoEncoder: false, mediaRecorder: false })).toBeNull();
  });
});

describe('frameCount', () => {
  test('5 s at 30 fps is 150 frames', () => {
    expect(frameCount(5, 30)).toBe(150);
  });
  test('rounds a varied take duration to whole frames', () => {
    expect(frameCount(4.71, 30)).toBe(141);
  });
});

describe('exportSize', () => {
  test('the p number is the short edge, and every edge is even', () => {
    expect(exportSize(1080, '16:9')).toEqual({ width: 1920, height: 1080 });
    expect(exportSize(1080, '9:16')).toEqual({ width: 1080, height: 1920 });
    expect(exportSize(720, '1:1')).toEqual({ width: 720, height: 720 });
    expect(exportSize(720, '16:9')).toEqual({ width: 1280, height: 720 });
  });
});

describe('exportFileName', () => {
  test('names the shot, take and move', () => {
    expect(exportFileName(3, 2, 'dolly-zoom', 'mp4')).toBe('dailies-shot03-take2-dolly-zoom.mp4');
    expect(exportFileName(12, 6, 'push-in', 'webm')).toBe('dailies-shot12-take6-push-in.webm');
  });
});

describe('createSingleFlight', () => {
  test('two overlapping calls share one run', async () => {
    let calls = 0;
    let release!: (v: string) => void;
    const run = createSingleFlight(() => {
      calls++;
      return new Promise<string>((r) => (release = r));
    });
    const a = run();
    const b = run();
    expect(b).toBe(a);
    release('done');
    expect(await a).toBe('done');
    expect(calls).toBe(1);
  });

  test('runs again once the first call has settled', async () => {
    let calls = 0;
    const run = createSingleFlight(async () => ++calls);
    await run();
    await run();
    expect(calls).toBe(2);
  });

  test('a failed run does not block the next one', async () => {
    let calls = 0;
    const run = createSingleFlight(async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return 'ok';
    });
    await expect(run()).rejects.toThrow('boom');
    expect(await run()).toBe('ok');
  });
});
