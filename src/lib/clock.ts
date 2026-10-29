// One clock for the synced take players. It is not React state: the players
// subscribe and redraw on each tick, so nothing above them re-renders at 60 fps.
export interface Clock {
  get(): number;
  set(t: number | ((t: number) => number)): void;
  /** Move on by `dt` seconds, back to 0 past `loopS`. */
  advance(dt: number, loopS: number): void;
  subscribe(f: () => void): () => void;
}

export function createClock(): Clock {
  let time = 0;
  const subs = new Set<() => void>();
  const set: Clock['set'] = (t) => {
    time = typeof t === 'function' ? t(time) : t;
    subs.forEach((f) => f());
  };
  return {
    get: () => time,
    set,
    advance: (dt, loopS) => set((t) => (t + dt > loopS ? 0 : t + dt)),
    subscribe(f) {
      subs.add(f);
      return () => void subs.delete(f);
    },
  };
}
