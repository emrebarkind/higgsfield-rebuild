// Depth Anything V2 small in a Web Worker (docs/spikes.md §1): WebGPU fp16,
// falling back to WASM q8 when WebGPU is missing, fails to start, or fails
// mid-inference (fallback.ts).
import { env, pipeline, RawImage } from '@huggingface/transformers';
import { boxBlur3, normalizeDepth } from './process';
import { createEstimators } from './fallback';
import { pickDepthDevice, type DepthRequest, type DepthResponse } from './protocol';

env.allowLocalModels = false;

const MODEL = 'onnx-community/depth-anything-v2-small';
/** Depth is read at this long edge; the renderer samples it, so more is wasted work. */
const INPUT_EDGE = 768;
const DTYPE = { webgpu: 'fp16', wasm: 'q8' } as const;

type Estimator = (image: RawImage) => Promise<{ predicted_depth: { dims: number[]; data: Float32Array } }>;
/** The request whose read is loading the model; download progress goes to it. */
let current = 0;

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

async function load(device: 'webgpu' | 'wasm'): Promise<Estimator> {
  return (await pipeline('depth-estimation', MODEL, {
    device,
    dtype: DTYPE[device],
    progress_callback: (p: { status: string; progress?: number }) => {
      if (p.status === 'progress_total' && typeof p.progress === 'number') {
        post({ id: current, type: 'status', phase: 'download', progress: p.progress / 100, device });
      }
    },
  })) as unknown as Estimator;
}

const estimators = createEstimators<RawImage, Awaited<ReturnType<Estimator>>>(load, async () => pickDepthDevice({ webgpu: await hasWebGpu() }) === 'webgpu');

self.onmessage = async (e: MessageEvent<DepthRequest>) => {
  const { id, blob } = e.data;
  try {
    current = id;
    const image = await RawImage.fromBlob(blob);
    const long = Math.max(image.width, image.height);
    const k = Math.min(1, INPUT_EDGE / long);
    const input = k < 1 ? await image.resize(Math.round(image.width * k), Math.round(image.height * k)) : image;
    const {
      out: { predicted_depth },
      device,
    } = await estimators.infer(input, (d) => post({ id, type: 'status', phase: 'infer', device: d }));
    const [height, width] = predicted_depth.dims.slice(-2);
    const data = boxBlur3(normalizeDepth(predicted_depth.data), width, height);
    post({ id, type: 'done', depth: { width, height, data }, device }, [data.buffer]);
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
