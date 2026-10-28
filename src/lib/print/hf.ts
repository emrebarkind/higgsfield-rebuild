// Experimental "print": send a circled take's frame and its move, as words, to
// a free image-to-video model (Wan 2.2) on Hugging Face ZeroGPU, from the
// visitor's browser (docs/spikes.md §5). It may queue or refuse; the take is
// never touched, and nothing retries on its own.
import type { Frame } from '../frame';
import { cleanGpuMessage } from '../framegen';

export const PRINT_SPACE = 'zerogpu-aoti/wan2-2-fp8da-aoti-faster';
const FETCH_TIMEOUT_MS = 60_000;

export interface PrintStatus {
  state: 'queued' | 'running' | 'done' | 'failed';
  position?: number;
  message?: string;
}

export class PrintError extends Error {}

type Ev = { type: string; stage?: string; position?: number | null; message?: string | null; data?: unknown };
type Job = AsyncIterable<Ev> & { cancel?: () => unknown };
export interface PrintClient {
  submit(endpoint: string, data: Record<string, unknown>): Job;
}

export function printPrompt(movePlain: string, framePrompt?: string): string {
  return framePrompt ? `${framePrompt.trim().replace(/\.$/, '')}. ${movePlain}` : movePlain;
}

const connectGradio = async (space: string): Promise<PrintClient> => {
  const { Client } = await import('@gradio/client');
  return (await Client.connect(space, { events: ['data', 'status'] })) as unknown as PrintClient;
};
const gradioFile = async (blob: Blob) => (await import('@gradio/client')).handle_file(blob);
const abortError = () => new DOMException('Print cancelled', 'AbortError');

export async function printWithAI(
  frame: Frame,
  prompt: string,
  onStatus: (s: PrintStatus) => void,
  signal?: AbortSignal,
  deps: { connect?: (space: string) => Promise<PrintClient>; fetchImpl?: typeof fetch; toFile?: (b: Blob) => unknown } = {},
): Promise<Blob> {
  const { connect = connectGradio, fetchImpl = fetch, toFile = gradioFile } = deps;
  const fail = (message: string) => {
    onStatus({ state: 'failed', message });
    return new PrintError(message);
  };
  if (signal?.aborted) throw abortError();

  let client: PrintClient;
  try {
    client = await connect(PRINT_SPACE);
  } catch {
    throw fail('The community GPU couldn’t be reached.');
  }
  const job = client.submit('/generate_video', {
    input_image: await toFile(frame.blob),
    prompt,
    steps: 4,
    duration_seconds: 3,
    guidance_scale: 1,
    guidance_scale_2: 1,
    seed: 42,
    randomize_seed: false,
  });

  const aborted = new Promise<never>((_, reject) =>
    signal?.addEventListener(
      'abort',
      () => {
        job.cancel?.();
        reject(abortError());
      },
      { once: true },
    ),
  );
  const run = (async () => {
    for await (const ev of job) {
      if (ev.type === 'status') {
        if (ev.stage === 'error') throw fail(cleanGpuMessage(ev.message ?? 'The community GPU failed.'));
        if (ev.stage === 'pending' && ev.position) onStatus({ state: 'queued', position: ev.position });
        else if (ev.stage === 'pending' || ev.stage === 'generating') onStatus({ state: 'running' });
      } else if (ev.type === 'data') {
        const out = (ev.data as { url?: string; video?: { url?: string } }[] | undefined)?.[0];
        const url = out?.video?.url ?? out?.url;
        if (!url) break;
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!res.ok) throw fail(`Couldn’t fetch the printed clip (${res.status}).`);
        const blob = await res.blob();
        onStatus({ state: 'done' });
        return blob;
      }
    }
    throw fail('No clip came back.');
  })();
  run.catch(() => {}); // if the abort wins the race, the run's later rejection is expected
  return Promise.race([run, aborted]);
}
