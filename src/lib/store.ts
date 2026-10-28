// Everything a visitor makes stays on their device, in IndexedDB: frames as
// bytes, depth maps, shots with their take recipes, and the current draft.
import { clear, createStore, del, entries, get, set, type UseStore } from 'idb-keyval';
import type { Frame } from './frame';
import type { DepthMap } from './depth/client';
import type { MoveId, MoveParams, OutAspect } from './moves';
import type { Shot, Take } from './takes';

export interface Draft {
  frameId: string;
  moveId: MoveId;
  base: MoveParams;
  aspect: OutAspect;
}

// One store per kind. Created lazily so importing this module never touches indexedDB (SSR, tests).
let stores: Record<'frames' | 'depth' | 'shots' | 'meta', UseStore> | null = null;
function db() {
  stores ??= {
    frames: createStore('dailies-frames', 'kv'),
    depth: createStore('dailies-depth', 'kv'),
    shots: createStore('dailies-shots', 'kv'),
    meta: createStore('dailies-meta', 'kv'),
  };
  return stores;
}

// Blobs are stored as bytes + type: the most portable thing IndexedDB holds.
type StoredFrame = Omit<Frame, 'blob'> & { bytes: ArrayBuffer; type: string };

export async function saveFrame(f: Frame): Promise<void> {
  const { blob, ...rest } = f;
  const stored: StoredFrame = { ...rest, bytes: await blob.arrayBuffer(), type: blob.type };
  await set(f.id, stored, db().frames);
}

export async function getFrame(id: string): Promise<Frame | undefined> {
  const s = await get<StoredFrame>(id, db().frames);
  if (!s) return undefined;
  const { bytes, type, ...rest } = s;
  return { ...rest, blob: new Blob([bytes], { type }) };
}

export async function saveDepth(frameId: string, d: DepthMap): Promise<void> {
  await set(frameId, { width: d.width, height: d.height, data: d.data }, db().depth);
}

export async function getDepth(frameId: string): Promise<DepthMap | undefined> {
  return get<DepthMap>(frameId, db().depth);
}

export async function saveShot(s: Shot, takes: Take[]): Promise<void> {
  await set(s.id, { shot: s, takes }, db().shots);
}

export async function listShots(): Promise<{ shot: Shot; takes: Take[] }[]> {
  const all = await entries<string, { shot: Shot; takes: Take[] }>(db().shots);
  return all
    .map(([, v]) => ({ shot: v.shot, takes: [...v.takes].sort((a, b) => a.number - b.number) }))
    .sort((a, b) => b.shot.createdAt - a.shot.createdAt || b.shot.number - a.shot.number);
}

export async function setCurrentShot(id: string | null): Promise<void> {
  if (id === null) await del('currentShot', db().meta);
  else await set('currentShot', id, db().meta);
}

export async function getCurrentShot(): Promise<string | null> {
  return (await get<string>('currentShot', db().meta)) ?? null;
}

export async function saveDraft(d: Draft): Promise<void> {
  await set('draft', d, db().meta);
}

export async function getDraft(): Promise<Draft | null> {
  return (await get<Draft>('draft', db().meta)) ?? null;
}

export async function clearAll(): Promise<void> {
  const s = db();
  await Promise.all([clear(s.frames), clear(s.depth), clear(s.shots), clear(s.meta)]);
}
