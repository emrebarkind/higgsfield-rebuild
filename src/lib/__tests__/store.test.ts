import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  clearAll,
  getCurrentShot,
  getDepth,
  getDraft,
  getFrame,
  listShots,
  saveDepth,
  saveDraft,
  saveFrame,
  saveShot,
  setCurrentShot,
} from '../store';
import type { Frame } from '../frame';
import { MOVES } from '../moves';
import { newShot, rollTakes } from '../takes';

const frame = (id: string, bytes = 1234): Frame => ({
  id,
  blob: new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }),
  width: 1015,
  height: 580,
  source: 'sample',
  prompt: 'a lake',
  createdAt: 1,
});

beforeEach(async () => {
  await clearAll();
});

describe('store', () => {
  test('a frame round-trips with its blob size and id', async () => {
    await saveFrame(frame('f1', 4321));
    const back = await getFrame('f1');
    expect(back?.id).toBe('f1');
    expect(back?.blob.size).toBe(4321);
    expect(back?.blob.type).toBe('image/jpeg');
    expect(back?.prompt).toBe('a lake');
  });

  test('a missing frame is undefined', async () => {
    expect(await getFrame('nope')).toBeUndefined();
  });

  test('a depth map round-trips its Float32Array', async () => {
    const data = new Float32Array([0, 0.25, 0.5, 1]);
    await saveDepth('f1', { width: 2, height: 2, data });
    const back = await getDepth('f1');
    expect(back?.data).toBeInstanceOf(Float32Array);
    expect(Array.from(back!.data)).toEqual([0, 0.25, 0.5, 1]);
    expect([back?.width, back?.height]).toEqual([2, 2]);
  });

  test('listShots is newest first, takes in number order', async () => {
    const base = MOVES['push-in'].defaults;
    const older = { ...newShot('f1', 'push-in', base, 1), createdAt: 100 };
    const newer = { ...newShot('f1', 'orbit', base, 2), createdAt: 200 };
    const a = rollTakes(older, 3, 7);
    const b = rollTakes(newer, 2, 9);
    await saveShot(a.shot, [...a.takes].reverse());
    await saveShot(b.shot, b.takes);
    const list = await listShots();
    expect(list.map((s) => s.shot.number)).toEqual([2, 1]);
    expect(list[1].takes.map((t) => t.number)).toEqual([1, 2, 3]);
  });

  test('saving a shot again replaces it', async () => {
    const r = rollTakes(newShot('f1', 'push-in', MOVES['push-in'].defaults, 1), 2, 1);
    await saveShot(r.shot, r.takes);
    await saveShot(r.shot, r.takes.map((t) => ({ ...t, circled: true })));
    const list = await listShots();
    expect(list).toHaveLength(1);
    expect(list[0].takes.every((t) => t.circled)).toBe(true);
  });

  test('the current shot round-trips, including null', async () => {
    await setCurrentShot('s1');
    expect(await getCurrentShot()).toBe('s1');
    await setCurrentShot(null);
    expect(await getCurrentShot()).toBeNull();
  });

  test('the draft round-trips', async () => {
    const draft = { frameId: 'f1', moveId: 'orbit' as const, base: MOVES.orbit.defaults, aspect: '9:16' as const };
    await saveDraft(draft);
    expect(await getDraft()).toEqual(draft);
  });

  test('clearAll empties everything', async () => {
    await saveFrame(frame('f1'));
    await saveDepth('f1', { width: 1, height: 1, data: new Float32Array([1]) });
    const r = rollTakes(newShot('f1', 'push-in', MOVES['push-in'].defaults, 1), 1, 1);
    await saveShot(r.shot, r.takes);
    await setCurrentShot(r.shot.id);
    await clearAll();
    expect(await getFrame('f1')).toBeUndefined();
    expect(await getDepth('f1')).toBeUndefined();
    expect(await listShots()).toEqual([]);
    expect(await getCurrentShot()).toBeNull();
    expect(await getDraft()).toBeNull();
  });
});
