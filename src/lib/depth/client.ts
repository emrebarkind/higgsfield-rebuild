// Main-thread side of the depth worker: one worker, one model load, and an
// in-memory cache keyed by frame id so a frame is never read twice per visit.
import type { Frame } from '../frame';
import type { DepthMap, DepthRequest, DepthResponse, DepthStatus } from './protocol';

export { pickDepthDevice } from './protocol';
export type { DepthDevice, DepthMap, DepthStatus } from './protocol';

/** A read with no message from the worker for this long fails, so Retry can run. */
export const DEPTH_IDLE_TIMEOUT_MS = 90_000;

let worker: Worker | null = null;
let nextId = 1;
const cache = new Map<string, Promise<DepthMap>>();
const listeners = new Map<number, (msg: DepthResponse) => void>();

/** The worker died (failed to load, or the tab reclaimed it): fail every read so a retry starts afresh. */
function dropWorker(message: string) {
  worker?.terminate();
  worker = null;
  for (const [id, listen] of [...listeners]) listen({ id, type: 'error', message });
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<DepthResponse>) => listeners.get(e.data.id)?.(e.data);
    worker.onerror = () => dropWorker('The depth reader stopped unexpectedly.');
    worker.onmessageerror = () => dropWorker('The depth reader sent something unreadable.');
  }
  return worker;
}

export function estimateDepth(frame: Frame, onStatus: (s: DepthStatus) => void): Promise<DepthMap> {
  const hit = cache.get(frame.id);
  if (hit) return hit;
  const id = nextId++;
  const job = new Promise<DepthMap>((resolve, reject) => {
    let idle: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        listeners.delete(id);
        dropWorker('Reading depth took too long.');
        reject(new Error('Reading depth took too long.'));
      }, DEPTH_IDLE_TIMEOUT_MS);
    };
    arm();
    listeners.set(id, (msg) => {
      if (msg.type === 'status') {
        arm();
        return onStatus({ phase: msg.phase, progress: msg.progress, device: msg.device });
      }
      clearTimeout(idle);
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
