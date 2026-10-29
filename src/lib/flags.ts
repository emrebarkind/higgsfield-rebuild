// Kill switches. The witness cam (council verdict, 29 Oct) turns off with
// WITNESS_ENABLED = false and a redeploy, or per visit with ?witness=0.
export const WITNESS_ENABLED = true;

export function witnessAllowed(search: string): boolean {
  return WITNESS_ENABLED && new URLSearchParams(search).get('witness') !== '0';
}

// Rack focus (council verdict, 29 Oct). false: no take blurs, every frame
// renders exactly as before the feature.
export const RACK_FOCUS = true;
