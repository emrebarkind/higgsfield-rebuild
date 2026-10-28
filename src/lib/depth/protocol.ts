// Shared between the depth worker and its client. No DOM or worker code here.

export interface DepthMap {
  width: number;
  height: number;
  /** 0..1, 1 = near. Row-major, `width * height` values. */
  data: Float32Array;
}

export type DepthDevice = 'webgpu' | 'wasm';
export interface DepthStatus {
  phase: 'download' | 'infer';
  progress?: number;
  device?: DepthDevice;
}

export function pickDepthDevice(caps: { webgpu: boolean }): DepthDevice {
  return caps.webgpu ? 'webgpu' : 'wasm';
}

export type DepthRequest = { id: number; blob: Blob };
export type DepthResponse =
  | ({ id: number; type: 'status' } & DepthStatus)
  | { id: number; type: 'done'; depth: DepthMap; device: DepthDevice }
  | { id: number; type: 'error'; message: string };
