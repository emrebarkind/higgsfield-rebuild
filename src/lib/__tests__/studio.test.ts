import { describe, expect, test } from 'vitest';
import { rollLabel } from '../useStudio';
import { MOVES } from '../moves';
import { newShot, rollTakes } from '../takes';

const base = MOVES['push-in'].defaults;
const draft = { frameId: 'f1', moveId: 'push-in' as const, base };

function shotWith(n: number) {
  let shot = newShot('f1', 'push-in', base, 1);
  if (n > 0) shot = rollTakes(shot, n, 100).shot;
  return shot;
}

describe('rollLabel', () => {
  test('no shot yet', () => {
    expect(rollLabel(null, draft, 3)).toEqual({ label: 'Roll 3 takes', disabled: false, newShot: true, count: 3 });
  });

  test('same draft with 3 takes rolls 3 more', () => {
    expect(rollLabel(shotWith(3), draft, 3)).toEqual({ label: 'Roll 3 more takes', disabled: false, newShot: false, count: 3 });
  });

  test('a changed move starts a new shot', () => {
    const r = rollLabel(shotWith(3), { ...draft, moveId: 'orbit' }, 3);
    expect(r.label).toBe('Roll new shot');
    expect(r.newShot).toBe(true);
    expect(r.disabled).toBe(false);
  });

  test('a changed parameter starts a new shot', () => {
    expect(rollLabel(shotWith(3), { ...draft, base: { ...base, durationS: 7 } }, 3).label).toBe('Roll new shot');
  });

  test('a full shot with the same draft is disabled and says why', () => {
    expect(rollLabel(shotWith(6), draft, 3)).toEqual({
      label: 'Shot full · 6 takes',
      disabled: true,
      newShot: false,
      count: 0,
    });
  });

  test('near the limit it rolls only what fits', () => {
    expect(rollLabel(shotWith(4), draft, 3)).toMatchObject({ label: 'Roll 2 more takes', count: 2 });
    expect(rollLabel(shotWith(5), draft, 3)).toMatchObject({ label: 'Roll 1 more take', count: 1 });
  });
});
