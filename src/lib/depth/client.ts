// Main-thread side of the depth worker: one worker, one model load, and an
// in-memory cache keyed by frame id so a frame is never read twice per visit.
import type { Frame } from '../frame';
import type { DepthMap, DepthRequest, DepthResponse, DepthStatus } from './protocol';

export { pickDepthDevice } from './protocol';
export type { DepthDevice, DepthMap, DepthStatus } from './protocol';

let worker: Worker | null = null;
let nextId = 1;
const cache = new Map<string, Promise<DepthMap>>();
const listeners = new Map<number, (msg: DepthResponse) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<DepthResponse>) => listeners.get(e.data.id)?.(e.data);
  }
  return worker;
}

export function estimateDepth(frame: Frame, onStatus: (s: DepthStatus) => void): Promise<DepthMap> {
  const hit = cache.get(frame.id);
  if (hit) return hit;
  const id = nextId++;
  const job = new Promise<DepthMap>((resolve, reject) => {
    listeners.set(id, (msg) => {
      if (msg.type === 'status') return onStatus({ phase: msg.phase, progress: msg.progress, device: msg.device });
      listeners.delete(id);
      if (msg.type === 'done') resolve(msg.depth);
      else reject(new Error(msg.message));
    });
    getWorker().postMessage({ id, blob: frame.blob } satisfies DepthRequest);
  });
  cache.set(frame.id, job);
  job.catch(() => cache.delete(frame.id)); // let a retry run again
  return job;
}

/** Seed the cache with a depth map restored from storage. */
export function primeDepth(frameId: string, depth: DepthMap) {
  cache.set(frameId, Promise.resolve(depth));
}
