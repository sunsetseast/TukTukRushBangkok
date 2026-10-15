export const NAVIGATION = {
  approach: 90,
  depart: 120,
  arrival: 9,
  manualMs: 5000,
  transitionMs: 300,
} as const;
/** Deterministic approach latch. Road distance prevents expansion across the river. */
export function approaching(was: boolean, distance: number) {
  return distance <= (was ? NAVIGATION.depart : NAVIGATION.approach);
}
