import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MOVES } from '../moves';
import type { Frame } from '../frame';

const db = vi.hoisted(() => ({
  saveFrame: vi.fn(),
  getFrame: vi.fn(),
  saveDepth: vi.fn(),
  getDepth: vi.fn(),
  saveShot: vi.fn(),
  listShots: vi.fn(),
  setCurrentShot: vi.fn(),
  getCurrentShot: vi.fn(),
  saveDraft: vi.fn(),
  getDraft: vi.fn(),
  clearAll: vi.fn(),
}));
vi.mock('../store', () => db);

const frame: Frame = { id: 'frame-1', blob: new Blob(['x']), width: 4, height: 3, source: 'upload', createdAt: 0 };
const depth = { width: 1, height: 1, data: new Float32Array([0.5]) };
const shot = (n: number) => ({
  shot: { id: `shot-${n}`, number: n, frameId: frame.id, moveId: 'push-in' as const, base: MOVES['push-in'].defaults, takeIds: [], createdAt: n },
  takes: [],
});
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
  for (const f of Object.values(db)) f.mockReset().mockResolvedValue(undefined);
  db.listShots.mockResolvedValue([shot(4), shot(2)]);
  db.getFrame.mockResolvedValue(frame);
  db.getDepth.mockResolvedValue(depth);
  db.getCurrentShot.mockResolvedValue(null);
});

describe('studio store', () => {
  test('opening a stored shot on a fresh load continues the shot numbering', async () => {
    const { studio } = await import('../useStudio');
    expect(await studio.openShot('shot-2')).toBe(true);
    expect(studio.get().nextShotNumber).toBe(5);
  });

  test('a storage write failure is remembered so the UI can say work is not being saved', async () => {
    db.saveDraft.mockRejectedValue(new Error('QuotaExceededError'));
    const { studio } = await import('../useStudio');
    expect(studio.get().storageError).toBe(false);
    await studio.openShot('shot-4');
    await flush();
    expect(studio.get().storageError).toBe(true);
  });

  test('a storage read failure on first load is remembered too', async () => {
    db.getDraft.mockRejectedValue(new Error('blocked'));
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const { studio } = await import('../useStudio');
    studio.ensureFrame();
    await flush();
    await flush();
    expect(studio.get().storageError).toBe(true);
    vi.unstubAllGlobals();
  });
});
