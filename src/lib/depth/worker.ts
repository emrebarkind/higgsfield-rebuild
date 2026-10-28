// Depth Anything V2 small in a Web Worker (docs/spikes.md §1): WebGPU fp16,
// falling back to WASM q8 when WebGPU is missing or fails to start.
import { env, pipeline, RawImage } from '@huggingface/transformers';
import { boxBlur3, normalizeDepth } from './process';
import { pickDepthDevice, type DepthRequest, type DepthResponse } from './protocol';

env.allowLocalModels = false;

const MODEL = 'onnx-community/depth-anything-v2-small';
/** Depth is read at this long edge; the renderer samples it, so more is wasted work. */
const INPUT_EDGE = 768;
const DTYPE = { webgpu: 'fp16', wasm: 'q8' } as const;

type Estimator = (image: RawImage) => Promise<{ predicted_depth: { dims: number[]; data: Float32Array } }>;
let loading: Promise<{ run: Estimator; device: 'webgpu' | 'wasm' }> | null = null;

const post = (msg: DepthResponse, transfer: Transferable[] = []) => self.postMessage(msg, { transfer });

async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) != null;
  } catch {
    return false;
  }
}

async function load(id: number, device: 'webgpu' | 'wasm') {
  const run = (await pipeline('depth-estimation', MODEL, {
    device,
    dtype: DTYPE[device],
    progress_callback: (p: { status: string; progress?: number }) => {
      if (p.status === 'progress_total' && typeof p.progress === 'number') {
        post({ id, type: 'status', phase: 'download', progress: p.progress / 100, device });
      }
    },
  })) as unknown as Estimator;
  return { run, device };
}

function getEstimator(id: number) {
  loading ??= (async () => {
    const device = pickDepthDevice({ webgpu: await hasWebGpu() });
    if (device === 'wasm') return load(id, 'wasm');
    try {
      return await load(id, 'webgpu');
    } catch {
      return load(id, 'wasm');
    }
  })();
  loading.catch(() => (loading = null)); // a failed download can be retried
  return loading;
}

self.onmessage = async (e: MessageEvent<DepthRequest>) => {
  const { id, blob } = e.data;
  try {
    const { run, device } = await getEstimator(id);
    post({ id, type: 'status', phase: 'infer', device });
    const image = await RawImage.fromBlob(blob);
    const long = Math.max(image.width, image.height);
    const k = Math.min(1, INPUT_EDGE / long);
    const input = k < 1 ? await image.resize(Math.round(image.width * k), Math.round(image.height * k)) : image;
    const { predicted_depth } = await run(input);
    const [height, width] = predicted_depth.dims.slice(-2);
    const data = boxBlur3(normalizeDepth(predicted_depth.data), width, height);
    post({ id, type: 'done', depth: { width, height, data }, device }, [data.buffer]);
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
