import { describe, expect, test } from 'vitest';
import { MOVES, STRENGTH_CAPS, type MoveParams } from '@/src/lib/moves';
import { MAX_TAKES, needsNewShot, newShot, nudgeTake, rollTakes, varyParams } from '@/src/lib/takes';

const base: MoveParams = { ...MOVES['push-in'].defaults, strength: 0.6, durationS: 5, handheld: 0.2 };

describe('varyParams', () => {
  test('is deterministic per seed and differs across seeds', () => {
    expect(varyParams(base, 11, 'push-in')).toEqual(varyParams(base, 11, 'push-in'));
    const outs = [1, 2, 3].map((s) => JSON.stringify(varyParams(base, s, 'push-in')));
    expect(new Set(outs).size).toBe(3);
  });

  test('stays in range', () => {
    for (let seed = 0; seed < 200; seed++) {
      const v = varyParams(base, seed, 'push-in');
      expect(v.strength).toBeGreaterThanOrEqual(base.strength * 0.9 - 1e-12);
      expect(v.strength).toBeLessThanOrEqual(Math.min(base.strength * 1.1, STRENGTH_CAPS['push-in']) + 1e-12);
      expect(Math.abs(v.durationS - base.durationS)).toBeLessThanOrEqual(0.4 + 1e-12);
      expect(v.durationS).toBeGreaterThanOrEqual(3);
      expect(v.durationS).toBeLessThanOrEqual(8);
      expect(v.handheld).toBeGreaterThanOrEqual(base.handheld);
      expect(v.handheld).toBeLessThanOrEqual(Math.min(1, base.handheld + 0.15) + 1e-12);
      expect(v.lensMm).toBe(base.lensMm);
      expect(v.focus).toEqual(base.focus);
      expect(v.easing).toBe(base.easing);
    }
  });

  test('never exceeds the move cap even when the base sits on it', () => {
    const onCap = { ...base, strength: STRENGTH_CAPS.orbit };
    for (let seed = 0; seed < 50; seed++) expect(varyParams(onCap, seed, 'orbit').strength).toBeLessThanOrEqual(STRENGTH_CAPS.orbit);
  });

  test('clamps duration into [3, 8] at the edges and handheld to 1', () => {
    for (let seed = 0; seed < 50; seed++) {
      const lo = varyParams({ ...base, durationS: 3 }, seed, 'push-in');
      const hi = varyParams({ ...base, durationS: 8, handheld: 0.95 }, seed, 'push-in');
      expect(lo.durationS).toBeGreaterThanOrEqual(3);
      expect(hi.durationS).toBeLessThanOrEqual(8);
      expect(hi.handheld).toBeLessThanOrEqual(1);
    }
  });
});

describe('needsNewShot', () => {
  const shot = newShot('frame-a', 'push-in', base, 1);
  test('null needs a new shot', () => {
    expect(needsNewShot(null, { frameId: 'frame-a', moveId: 'push-in', base })).toBe(true);
  });
  test('same frame, move and base does not', () => {
    expect(needsNewShot(shot, { frameId: 'frame-a', moveId: 'push-in', base: { ...base, focus: { ...base.focus } } })).toBe(false);
  });
  test('a different frame, move or any base field does', () => {
    expect(needsNewShot(shot, { frameId: 'frame-b', moveId: 'push-in', base })).toBe(true);
    expect(needsNewShot(shot, { frameId: 'frame-a', moveId: 'orbit', base })).toBe(true);
    const changes: Partial<MoveParams>[] = [
      { strength: 0.5 },
      { durationS: 6 },
      { easing: 'linear' },
      { lensMm: 50 },
      { focus: { x: 0.3, y: 0.5 } },
      { handheld: 0.3 },
    ];
    for (const c of changes) expect(needsNewShot(shot, { frameId: 'frame-a', moveId: 'push-in', base: { ...base, ...c } })).toBe(true);
  });
});

describe('needsNewShot and the focus point', () => {
  test('without rack focus, moving the focus only starts a new shot for moves that use it', () => {
    const still = { ...base, rack: false };
    const f = { ...still, focus: { x: 0.2, y: 0.7 } };
    const dolly = newShot('frame-a', 'dolly-zoom', still, 1);
    expect(needsNewShot(dolly, { frameId: 'frame-a', moveId: 'dolly-zoom', base: f })).toBe(false);
    const pan = newShot('frame-a', 'pan-left', still, 1);
    expect(needsNewShot(pan, { frameId: 'frame-a', moveId: 'pan-left', base: f })).toBe(false);
    const push = newShot('frame-a', 'push-in', still, 1);
    expect(needsNewShot(push, { frameId: 'frame-a', moveId: 'push-in', base: f })).toBe(true);
  });
});

describe('rollTakes', () => {
  test('numbers takes 1..3 then 4..6, then refuses past MAX_TAKES', () => {
    expect(MAX_TAKES).toBe(6);
    const s0 = newShot('frame-a', 'push-in', base, 3);
    const r1 = rollTakes(s0, 3, 100);
    expect(r1.takes.map((t) => t.number)).toEqual([1, 2, 3]);
    expect(r1.shot.takeIds).toEqual(r1.takes.map((t) => t.id));
    expect(r1.takes.every((t) => t.shotId === s0.id && !t.circled)).toBe(true);
    const r2 = rollTakes(r1.shot, 3, 100);
    expect(r2.takes.map((t) => t.number)).toEqual([4, 5, 6]);
    expect(r2.shot.takeIds).toHaveLength(6);
    expect(() => rollTakes(r2.shot, 1, 100)).toThrow(RangeError);
  });

  test('does not mutate the shot it is given', () => {
    const s0 = newShot('frame-a', 'push-in', base, 1);
    rollTakes(s0, 2, 5);
    expect(s0.takeIds).toEqual([]);
  });

  test('take seed is seedBase + take number', () => {
    const { takes } = rollTakes(newShot('frame-a', 'push-in', base, 1), 3, 40);
    expect(takes.map((t) => t.seed)).toEqual([41, 42, 43]);
  });

  test('the same seedBase on fresh shots gives identical params', () => {
    const a = rollTakes(newShot('frame-a', 'push-in', base, 1), 3, 7).takes.map((t) => t.params);
    const b = rollTakes(newShot('frame-a', 'push-in', base, 1), 3, 7).takes.map((t) => t.params);
    expect(a).toEqual(b);
  });
});

describe('nudgeTake', () => {
  test('saves a tweak as a new take of the same shot, keeping lens and focus', () => {
    const { shot, takes } = rollTakes(newShot('frame-a', 'push-in', base, 1), 2, 0);
    const r = nudgeTake(shot, takes[1], { ...takes[1].params, strength: 0.9, lensMm: 85, focus: { x: 0, y: 0 } });
    expect(r.take.number).toBe(3);
    expect(r.take.shotId).toBe(shot.id);
    expect(r.take.seed).toBe(takes[1].seed);
    expect(r.take.params.strength).toBe(0.9);
    expect(r.take.params.lensMm).toBe(base.lensMm);
    expect(r.take.params.focus).toEqual(base.focus);
    expect(r.shot.takeIds).toEqual([...shot.takeIds, r.take.id]);
  });

  test('clamps strength to the move cap and counts toward MAX_TAKES', () => {
    const { shot, takes } = rollTakes(newShot('frame-a', 'orbit', base, 1), 5, 0);
    const r = nudgeTake(shot, takes[0], { ...takes[0].params, strength: 3 });
    expect(r.take.params.strength).toBe(STRENGTH_CAPS.orbit);
    expect(() => nudgeTake(r.shot, takes[0], takes[0].params)).toThrow(RangeError);
  });
});

describe('needsNewShot with rack focus', () => {
  const frameId = 'f';
  const pan = { ...MOVES['pan-left'].defaults, rack: true };
  const shot = newShot(frameId, 'pan-left', pan, 1);

  test('moving the focus point starts a new shot when focus racks onto it, even on a pan', () => {
    expect(needsNewShot(shot, { frameId, moveId: 'pan-left', base: { ...pan, focus: { x: 0.2, y: 0.3 } } })).toBe(true);
    const noRack = newShot(frameId, 'pan-left', { ...pan, rack: false }, 1);
    expect(needsNewShot(noRack, { frameId, moveId: 'pan-left', base: { ...pan, rack: false, focus: { x: 0.2, y: 0.3 } } })).toBe(false);
  });

  test('switching rack focus on or off starts a new shot', () => {
    expect(needsNewShot(shot, { frameId, moveId: 'pan-left', base: { ...pan, rack: false } })).toBe(true);
  });
});
