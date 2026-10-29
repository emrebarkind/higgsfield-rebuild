// Export jobs live outside the button that starts them, keyed by take id, so
// a 1080p render survives focusing another take or switching the aspect, and
// its file stays downloadable for the rest of the visit. Only Cancel stops one.
import { useSyncExternalStore } from 'react';
import type { OutAspect } from '../moves';

export type ExportJob =
  | { kind: 'idle' }
  | { kind: 'running'; done: number; total: number; aspect: OutAspect; height: 720 | 1080 }
  | { kind: 'done'; url: string; name: string; webm: boolean }
  | { kind: 'error'; message: string };

export interface ExportSpec {
  total: number;
  aspect: OutAspect;
  height: 720 | 1080;
  name: (webm: boolean) => string;
}
type Run = (onProgress: (done: number, total: number) => void, signal: AbortSignal) => Promise<Blob>;

const IDLE: ExportJob = { kind: 'idle' };

function clickDownload(url: string, name: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
}

export function createExportJobs(
  io: { makeUrl: (b: Blob) => string; revoke: (url: string) => void; download: (url: string, name: string) => void } = {
    makeUrl: (b) => URL.createObjectURL(b),
    revoke: (u) => URL.revokeObjectURL(u),
    download: clickDownload,
  },
) {
  const jobs = new Map<string, ExportJob>();
  const files = new Map<string, string>();
  const aborts = new Map<string, AbortController>();
  const subs = new Set<() => void>();
  const put = (takeId: string, job: ExportJob) => {
    jobs.set(takeId, job);
    subs.forEach((f) => f());
  };

  return {
    get: (takeId: string): ExportJob => jobs.get(takeId) ?? IDLE,
    subscribe(f: () => void) {
      subs.add(f);
      return () => void subs.delete(f);
    },
    start(takeId: string, spec: ExportSpec, run: Run) {
      if (jobs.get(takeId)?.kind === 'running') return;
      const abort = new AbortController();
      aborts.set(takeId, abort);
      const { aspect, height } = spec;
      put(takeId, { kind: 'running', done: 0, total: spec.total, aspect, height });
      run((done, total) => put(takeId, { kind: 'running', done, total, aspect, height }), abort.signal).then(
        (blob) => {
          const old = files.get(takeId);
          if (old) io.revoke(old);
          const webm = blob.type === 'video/webm';
          const url = io.makeUrl(blob);
          const name = spec.name(webm);
          files.set(takeId, url);
          put(takeId, { kind: 'done', url, name, webm });
          io.download(url, name);
        },
        (err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') put(takeId, IDLE);
          else put(takeId, { kind: 'error', message: err instanceof Error ? err.message : String(err) });
        },
      );
    },
    cancel(takeId: string) {
      aborts.get(takeId)?.abort();
    },
  };
}

export const exportJobs = createExportJobs();

export function useExportJob(takeId: string): ExportJob {
  return useSyncExternalStore(exportJobs.subscribe, () => exportJobs.get(takeId), () => IDLE);
}
