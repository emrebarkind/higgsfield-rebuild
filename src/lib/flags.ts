// Kill switches. The witness cam (council verdict, 29 Oct) turns off with
// WITNESS_ENABLED = false and a redeploy, or per visit with ?witness=0.
export const WITNESS_ENABLED = true;

export function witnessAllowed(search: string): boolean {
  return WITNESS_ENABLED && new URLSearchParams(search).get('witness') !== '0';
}
