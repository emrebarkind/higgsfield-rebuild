// Free text-to-frame: FLUX.1 [schnell] on Hugging Face's free community GPUs
// (ZeroGPU), called with @gradio/client from the visitor's browser, so each
// visitor uses their own anonymous quota. No key, no server of ours.
// Pollinations was the plan; it refuses browser calls without a Turnstile
// token and rate-limits Vercel's shared IPs (DECISIONS.md, docs/spikes.md).
import type { OutAspect } from './moves';

export const SPACE = 'black-forest-labs/FLUX.1-schnell';
export const MAX_PROMPT = 500;
const SIZES: Record<OutAspect, { width: number; height: number }> = {
  '16:9': { width: 1536, height: 864 },
  '9:16': { width: 864, height: 1536 },
  '1:1': { width: 1152, height: 1152 },
};
const FETCH_TIMEOUT_MS = 30_000;

export class FrameGenError extends Error {
  constructor(
    readonly kind: 'invalid' | 'rate-limited' | 'upstream',
    message: string,
  ) {
    super(message);
  }
}

type Event = { type: string; stage?: string; position?: number | null; message?: string | null; data?: unknown };
export interface GenClient {
  submit(endpoint: string, data: Record<string, unknown>): AsyncIterable<Event>;
}

export function validatePrompt(prompt: string): string | null {
  const p = prompt.trim();
  if (!p) return 'Describe the frame you want first.';
  if (p.length > MAX_PROMPT) return `Keep it under ${MAX_PROMPT} characters (this one has ${p.length}).`;
  return null;
}

export function frameSize(aspect: OutAspect) {
  return SIZES[aspect];
}

const connectGradio = async (space: string): Promise<GenClient> => {
  const { Client } = await import('@gradio/client');
  // Without 'status' the client yields only results and silently ends on errors (quota, queue).
  return (await Client.connect(space, { events: ['data', 'status'] })) as unknown as GenClient;
};

/** Drop ZeroGPU's "authenticate with a token" advice: Dailies stays keyless. */
export function cleanGpuMessage(message: string): string {
  return message.replace(/\s*Authenticate with a Hugging Face token[\s\S]*$/, '');
}

function fromMessage(message: string | null | undefined): FrameGenError {
  const m = cleanGpuMessage(message ?? 'The free GPU service failed.');
  return /quota|exceeded|limit/i.test(m) ? new FrameGenError('rate-limited', m) : new FrameGenError('upstream', m);
}

export async function generateFrame(
  prompt: string,
  aspect: OutAspect,
  seed: number,
  onStatus?: (s: { queuePosition: number | null }) => void,
  deps: { connect?: (space: string) => Promise<GenClient>; fetchImpl?: typeof fetch } = {},
): Promise<Blob> {
  const invalid = validatePrompt(prompt);
  if (invalid) throw new FrameGenError('invalid', invalid);
  const { connect = connectGradio, fetchImpl = fetch } = deps;

  let client: GenClient;
  try {
    client = await connect(SPACE);
  } catch {
    throw new FrameGenError('upstream', 'The free GPU service didn’t answer.');
  }
  const { width, height } = frameSize(aspect);
  try {
    for await (const ev of client.submit('/infer', { prompt: prompt.trim(), seed, randomize_seed: false, width, height, num_inference_steps: 4 })) {
      if (ev.type === 'status') {
        if (ev.stage === 'error') throw fromMessage(ev.message);
        if (ev.stage === 'pending') onStatus?.({ queuePosition: ev.position ?? null });
      } else if (ev.type === 'data') {
        const file = (ev.data as { url?: string }[] | undefined)?.[0];
        if (!file?.url) break;
        const res = await fetchImpl(file.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!res.ok) throw new FrameGenError('upstream', `Couldn’t fetch the generated frame (${res.status}).`);
        return await res.blob();
      }
    }
  } catch (err) {
    if (err instanceof FrameGenError) throw err;
    throw fromMessage(err instanceof Error ? err.message : String(err));
  }
  throw new FrameGenError('upstream', 'No frame came back.');
}
