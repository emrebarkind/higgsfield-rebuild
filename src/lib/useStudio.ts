// Studio state: the draft (frame + move + params), the current shot and its
// takes. Kept in a module-level store so it survives moving between Studio and
// Moves; Task 9 persists it to IndexedDB.
import { useSyncExternalStore } from 'react';
import { MOVES, STRENGTH_CAPS, type MoveId, type MoveParams, type OutAspect } from './moves';
import { MAX_TAKES, needsNewShot, newShot, nudgeTake, rollTakes, type Shot, type Take } from './takes';
import { prepareFrame, validateFile, type Frame } from './frame';
import { estimateDepth, type DepthMap, type DepthStatus } from './depth/client';
import { SAMPLES, type Sample } from './samples';

type Draft = { frameId: string; moveId: MoveId; base: MoveParams };

export interface RollState {
  label: string;
  disabled: boolean;
  newShot: boolean;
  /** How many takes a press will roll (fewer near the shot's limit). */
  count: number;
}

export function rollLabel(shot: Shot | null, draft: Draft, count: number): RollState {
  if (needsNewShot(shot, draft)) {
    return { label: shot ? 'Roll new shot' : `Roll ${count} takes`, disabled: false, newShot: true, count };
  }
  const room = MAX_TAKES - shot!.takeIds.length;
  if (room <= 0) {
    return { label: 'Shot is full — change something to roll a new shot', disabled: true, newShot: false, count: 0 };
  }
  const n = Math.min(count, room);
  return { label: `Roll ${n} more ${n === 1 ? 'take' : 'takes'}`, disabled: false, newShot: false, count: n };
}

export interface StudioState {
  frame: Frame | null;
  depth: DepthMap | null;
  depthStatus: DepthStatus | null;
  depthError: string | null;
  frameError: string | null;
  frameBusy: boolean;
  /** The frame and depth the current shot was rolled on (the draft may have moved on). */
  shotFrame: Frame | null;
  shotDepth: DepthMap | null;
  moveId: MoveId;
  base: MoveParams;
  aspect: OutAspect;
  shot: Shot | null;
  takes: Take[];
  focusedTake: string | null;
  rolling: boolean;
  nextShotNumber: number;
}

const initial: StudioState = {
  frame: null,
  depth: null,
  depthStatus: null,
  depthError: null,
  frameError: null,
  frameBusy: false,
  shotFrame: null,
  shotDepth: null,
  moveId: SAMPLES[0].moveId,
  base: SAMPLES[0].params,
  aspect: '16:9',
  shot: null,
  takes: [],
  focusedTake: null,
  rolling: false,
  nextShotNumber: 1,
};

let state = initial;
const subs = new Set<() => void>();
const get = () => state;
function set(patch: Partial<StudioState>) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** Deterministic per shot, so re-rolling a restored shot continues its seeds. */
function seedBaseFor(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return (h >>> 0) % 100000;
}

function readDepth(frame: Frame) {
  set({ depth: null, depthError: null, depthStatus: null });
  estimateDepth(frame, (s) => {
    if (state.frame?.id === frame.id) set({ depthStatus: s });
  }).then(
    (depth) => {
      if (state.frame?.id === frame.id) set({ depth, depthStatus: null });
    },
    (err: unknown) => {
      if (state.frame?.id === frame.id) set({ depthError: err instanceof Error ? err.message : String(err), depthStatus: null });
    },
  );
}

async function loadFrame(next: Promise<Frame>) {
  set({ frameBusy: true, frameError: null });
  try {
    const frame = await next;
    set({ frame, frameBusy: false });
    readDepth(frame);
  } catch (err) {
    set({ frameBusy: false, frameError: err instanceof Error ? err.message : 'Could not open that image.' });
  }
}

let rollingNow = false;

export const studio = {
  get,
  /** File upload, a generated frame, or one of the samples. Keeps the move and its settings. */
  setFrame(input: File | Blob | Sample, source: Frame['source'] = 'upload', prompt?: string) {
    if (input instanceof Blob) {
      const check = validateFile(input);
      if (!check.ok) return set({ frameError: check.message });
      return loadFrame(prepareFrame(input, source, prompt));
    }
    return loadFrame(
      fetch(input.src)
        .then((r) => {
          if (!r.ok) throw new Error('Could not load that sample.');
          return r.blob();
        })
        .then((b) => prepareFrame(b, 'sample', input.prompt)),
    );
  },
  /** First visit: a sample frame with its move already previewing. */
  ensureFrame() {
    if (!state.frame && !state.frameBusy) {
      const s = SAMPLES[0];
      set({ moveId: s.moveId, base: s.params });
      studio.setFrame(s);
    }
  },
  retryDepth() {
    if (state.frame) readDepth(state.frame);
  },
  setMove(id: MoveId) {
    const d = MOVES[id].defaults;
    set({ moveId: id, base: { ...d, lensMm: state.base.lensMm, focus: state.base.focus } });
  },
  setParam<K extends keyof MoveParams>(k: K, v: MoveParams[K]) {
    const value = k === 'strength' ? (Math.min(v as number, STRENGTH_CAPS[state.moveId]) as MoveParams[K]) : v;
    set({ base: { ...state.base, [k]: value } });
  },
  setAspect(aspect: OutAspect) {
    set({ aspect });
  },
  roll(count = 3) {
    const { frame, depth, moveId, base } = state;
    if (rollingNow || !frame || !depth) return;
    const r = rollLabel(state.shot, { frameId: frame.id, moveId, base }, count);
    if (r.disabled) return;
    rollingNow = true;
    let shot = state.shot;
    let takes = state.takes;
    let patch: Partial<StudioState> = {};
    if (r.newShot) {
      shot = newShot(frame.id, moveId, { ...base, focus: { ...base.focus } }, state.nextShotNumber);
      takes = [];
      patch = { shotFrame: frame, shotDepth: depth, nextShotNumber: state.nextShotNumber + 1, focusedTake: null };
    }
    const rolled = rollTakes(shot!, r.count, seedBaseFor(shot!.id));
    set({ ...patch, shot: rolled.shot, takes: [...takes, ...rolled.takes], rolling: true });
    setTimeout(() => {
      rollingNow = false;
      set({ rolling: false });
    }, 600);
  },
  circle(takeId: string) {
    set({ takes: state.takes.map((t) => (t.id === takeId ? { ...t, circled: !t.circled } : t)) });
  },
  focus(takeId: string | null) {
    set({ focusedTake: takeId });
  },
  nudge(takeId: string, params: MoveParams) {
    const from = state.takes.find((t) => t.id === takeId);
    if (!state.shot || !from || state.shot.takeIds.length >= MAX_TAKES) return;
    const r = nudgeTake(state.shot, from, params);
    set({ shot: r.shot, takes: [...state.takes, r.take], focusedTake: r.take.id });
  },
};

export function useStudio() {
  const s = useSyncExternalStore(subscribe, get, () => initial);
  const draft = s.frame ? { frameId: s.frame.id, moveId: s.moveId, base: s.base } : null;
  const roll = draft ? rollLabel(s.shot, draft, 3) : { label: 'Roll 3 takes', disabled: true, newShot: true, count: 0 };
  return { ...s, rollState: roll, ...studio };
}
