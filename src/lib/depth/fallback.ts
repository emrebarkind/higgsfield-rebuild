// Which depth pipeline runs: WebGPU when there is an adapter, else WASM. WebGPU
// can also fail later, at inference (device lost, an fp16 op missing), so an
// inference error on WebGPU drops that pipeline and retries once on WASM, which
// then sticks for the rest of the visit. No worker or model code here.
export type Device = 'webgpu' | 'wasm';
type Run<I, O> = (input: I) => Promise<O>;

export function createEstimators<I, O>(load: (device: Device) => Promise<Run<I, O>>, hasWebGpu: () => Promise<boolean>) {
  let loading: Promise<{ run: Run<I, O>; device: Device }> | null = null;
  const keep = (p: Promise<{ run: Run<I, O>; device: Device }>) => {
    loading = p;
    p.catch(() => {
      if (loading === p) loading = null; // a failed download can be retried
    });
    return p;
  };
  const wasm = () => keep(load('wasm').then((run) => ({ run, device: 'wasm' as const })));
  const get = () =>
    loading ??
    keep(
      (async () => {
        if (!(await hasWebGpu())) return { run: await load('wasm'), device: 'wasm' as const };
        try {
          return { run: await load('webgpu'), device: 'webgpu' as const };
        } catch {
          return { run: await load('wasm'), device: 'wasm' as const };
        }
      })(),
    );

  return {
    async infer(input: I, onDevice: (d: Device) => void): Promise<{ out: O; device: Device }> {
      const e = await get();
      onDevice(e.device);
      try {
        return { out: await e.run(input), device: e.device };
      } catch (err) {
        if (e.device !== 'webgpu') throw err;
        const w = await wasm();
        onDevice(w.device);
        return { out: await w.run(input), device: w.device };
      }
    },
  };
}
