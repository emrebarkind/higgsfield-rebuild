// Print jobs live outside the panel that starts them, keyed by take id, so a
// print that queued for minutes survives focusing another take or leaving
// the Studio. Only Cancel stops one; the result stays for the rest of the visit.
import { useSyncExternalStore } from 'react';
import type { PrintStatus } from './hf';

export type PrintJob =
  | { kind: 'idle' }
  | { kind: 'working'; status: PrintStatus }
  | { kind: 'done'; url: string }
  | { kind: 'failed'; detail?: string };

type Run = (onStatus: (s: PrintStatus) => void, signal: AbortSignal) => Promise<Blob>;

const IDLE: PrintJob = { kind: 'idle' };

export function createPrintJobs(makeUrl: (b: Blob) => string = (b) => URL.createObjectURL(b)) {
  const jobs = new Map<string, PrintJob>();
  const aborts = new Map<string, AbortController>();
  const subs = new Set<() => void>();
  const put = (takeId: string, job: PrintJob) => {
    jobs.set(takeId, job);
    subs.forEach((f) => f());
  };

  return {
    get: (takeId: string): PrintJob => jobs.get(takeId) ?? IDLE,
    subscribe(f: () => void) {
      subs.add(f);
      return () => void subs.delete(f);
    },
    start(takeId: string, run: Run) {
      if (jobs.get(takeId)?.kind === 'working') return;
      const abort = new AbortController();
      aborts.set(takeId, abort);
      put(takeId, { kind: 'working', status: { state: 'queued' } });
      run((status) => {
        if (jobs.get(takeId)?.kind === 'working') put(takeId, { kind: 'working', status });
      }, abort.signal).then(
        (blob) => put(takeId, { kind: 'done', url: makeUrl(blob) }),
        (err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') put(takeId, IDLE);
          else put(takeId, { kind: 'failed', detail: err instanceof Error ? err.message : undefined });
        },
      );
    },
    cancel(takeId: string) {
      aborts.get(takeId)?.abort();
    },
  };
}

export const printJobs = createPrintJobs();

export function usePrintJob(takeId: string): PrintJob {
  return useSyncExternalStore(printJobs.subscribe, () => printJobs.get(takeId), () => IDLE);
}
