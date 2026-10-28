import { STRENGTH_CAPS, usesFocus, type MoveId, type MoveParams } from './moves';

// A shot is frame + move + base params, frozen at its first roll. Takes are
// seeded variations of that base: recipes, rendered live, never stored as video.

export interface Shot {
  id: string;
  number: number;
  frameId: string;
  moveId: MoveId;
  base: MoveParams;
  takeIds: string[];
  createdAt: number;
}
export interface Take {
  id: string;
  shotId: string;
  number: number;
  seed: number;
  params: MoveParams;
  circled: boolean;
  createdAt: number;
}

export const MAX_TAKES = 6;

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function newShot(frameId: string, moveId: MoveId, base: MoveParams, number: number): Shot {
  return { id: crypto.randomUUID(), number, frameId, moveId, base, takeIds: [], createdAt: Date.now() };
}

function sameParams(a: MoveParams, b: MoveParams, withFocus: boolean): boolean {
  return (
    a.strength === b.strength &&
    a.durationS === b.durationS &&
    a.easing === b.easing &&
    a.lensMm === b.lensMm &&
    (!withFocus || (a.focus.x === b.focus.x && a.focus.y === b.focus.y)) &&
    a.handheld === b.handheld
  );
}

export function needsNewShot(
  shot: Shot | null,
  draft: { frameId: string; moveId: MoveId; base: MoveParams },
): boolean {
  if (!shot) return true;
  return shot.frameId !== draft.frameId || shot.moveId !== draft.moveId || !sameParams(shot.base, draft.base, usesFocus(shot.moveId));
}

/** How takes differ, the way real takes do: a little strength, timing and shake. */
export function varyParams(base: MoveParams, seed: number, moveId?: MoveId): MoveParams {
  const rand = mulberry32(seed * 2654435761);
  const cap = moveId ? STRENGTH_CAPS[moveId] : Infinity;
  const strength = Math.min(cap, base.strength * (1 + (rand() * 2 - 1) * 0.1));
  const durationS = clamp(base.durationS + (rand() * 2 - 1) * 0.4, 3, 8);
  const handheld = Math.min(1, base.handheld + rand() * 0.15);
  return { ...base, focus: { ...base.focus }, strength, durationS, handheld };
}

function assertRoom(shot: Shot, count: number) {
  if (shot.takeIds.length + count > MAX_TAKES) {
    throw new RangeError(`A shot holds at most ${MAX_TAKES} takes; this one has ${shot.takeIds.length}.`);
  }
}

export function rollTakes(shot: Shot, count: number, seedBase: number): { shot: Shot; takes: Take[] } {
  assertRoom(shot, count);
  const now = Date.now();
  const takes: Take[] = Array.from({ length: count }, (_, i) => {
    const number = shot.takeIds.length + i + 1;
    const seed = seedBase + number;
    return {
      id: crypto.randomUUID(),
      shotId: shot.id,
      number,
      seed,
      params: varyParams(shot.base, seed, shot.moveId),
      circled: false,
      createdAt: now,
    };
  });
  return { shot: { ...shot, takeIds: [...shot.takeIds, ...takes.map((t) => t.id)] }, takes };
}

/** Save a tweaked take as a new take of the same shot. Lens and focus stay the shot's. */
export function nudgeTake(shot: Shot, from: Take, params: MoveParams): { shot: Shot; take: Take } {
  assertRoom(shot, 1);
  const take: Take = {
    id: crypto.randomUUID(),
    shotId: shot.id,
    number: shot.takeIds.length + 1,
    seed: from.seed,
    params: {
      ...params,
      strength: clamp(params.strength, 0, STRENGTH_CAPS[shot.moveId]),
      durationS: clamp(params.durationS, 3, 8),
      handheld: clamp(params.handheld, 0, 1),
      lensMm: shot.base.lensMm,
      focus: { ...shot.base.focus },
    },
    circled: false,
    createdAt: Date.now(),
  };
  return { shot: { ...shot, takeIds: [...shot.takeIds, take.id] }, take };
}
