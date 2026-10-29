import type { World } from "./projection";
export type ChunkReference = {
  id: string;
  origin: [number, number];
  file: string;
  sha256: string;
  bytes: number;
};
/** Visual residency is independent of the persistent road graph, physics and vehicle.
 * Only a 3x3 neighborhood is requested; an existing 5x5 retention collar avoids churn.
 * Two concurrent fetches and one installation per tick bound activation work.
 */
export class GeographicStream<T> {
  readonly active = new Map<string, T>();
  private pending = new Map<string, AbortController>();
  private ready = new Map<string, T>();
  private wanted = new Set<string>();
  private retained = new Set<string>();
  private queue: ChunkReference[] = [];
  private cell = "";
  private stopped = false;
  readonly stats = { loaded: 0, disposed: 0, requests: 0, errors: 0 };
  constructor(
    readonly chunks: ChunkReference[],
    private load: (c: ChunkReference, s: AbortSignal) => Promise<T>,
    private install: (value: T, c: ChunkReference) => void,
    private dispose: (value: T) => void,
    private failed: (error: unknown) => void = console.error,
  ) {}
  update(p: World, camera?: World) {
    const x = Math.floor(p.x / 1024),
      z = Math.floor(p.z / 1024);
    // Chase camera needs are bounded to its adjacent tile; overhead uses a separate coarse overview.
    const cx = camera ? Math.floor(camera.x / 1024) : x,
      cz = camera ? Math.floor(camera.z / 1024) : z;
    const cell = `${x}:${z}:${cx}:${cz}`;
    if (cell !== this.cell) {
      this.cell = cell;
      this.wanted.clear();
      this.retained.clear();
      const centers = [
        [x, z],
        ...(Math.abs(cx - x) <= 1 && Math.abs(cz - z) <= 1 ? [[cx, cz]] : []),
      ];
      for (const c of this.chunks) {
        const a = c.origin[0] / 1024,
          b = c.origin[1] / 1024;
        if (
          centers.some(
            ([x, z]) => Math.max(Math.abs(a - x!), Math.abs(b - z!)) <= 1,
          )
        )
          this.wanted.add(c.id);
        if (Math.max(Math.abs(a - x), Math.abs(b - z)) <= 2)
          this.retained.add(c.id);
      }
      for (const [id, v] of this.active)
        if (!this.retained.has(id)) {
          this.dispose(v);
          this.active.delete(id);
          this.stats.disposed++;
        }
      for (const [id, v] of this.ready)
        if (!this.wanted.has(id)) {
          this.dispose(v);
          this.ready.delete(id);
        }
      for (const [id, abort] of this.pending)
        if (!this.wanted.has(id)) {
          abort.abort();
          this.pending.delete(id);
        }
      this.queue = this.chunks
        .filter(
          (c) =>
            this.wanted.has(c.id) &&
            !this.active.has(c.id) &&
            !this.pending.has(c.id) &&
            !this.ready.has(c.id),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.origin[0] + 512 - p.x, a.origin[1] + 512 - p.z) -
            Math.hypot(b.origin[0] + 512 - p.x, b.origin[1] + 512 - p.z),
        );
    }
    // Finished decode order is not player priority. A fast distant response must
    // not delay the tile around/ahead of the vehicle.
    const priority = (c: ChunkReference) => {
      const dx = c.origin[0] + 512 - p.x, dz = c.origin[1] + 512 - p.z;
      const fx = p.x - (camera?.x ?? p.x), fz = p.z - (camera?.z ?? p.z), length = Math.hypot(fx, fz);
      return Math.hypot(dx, dz) - (length > 1 ? (dx * fx + dz * fz) / length * .35 : 0);
    };
    this.queue.sort((a, b) => priority(a) - priority(b));
    const next = [...this.ready].sort((a, b) => {
      const ar = this.chunks.find(c => c.id === a[0])!, br = this.chunks.find(c => c.id === b[0])!;
      return priority(ar) - priority(br);
    })[0];
    if (next) {
      const [id, v] = next;
      this.ready.delete(id);
      const ref = this.chunks.find((c) => c.id === id)!;
      this.install(v, ref);
      this.active.set(id, v);
      this.stats.loaded++;
    }
    while (!this.stopped && this.pending.size < 2 && this.queue.length) {
      const c = this.queue.shift()!,
        abort = new AbortController();
      this.pending.set(c.id, abort);
      this.stats.requests++;
      this.load(c, abort.signal)
        .then((v) => {
          if (this.stopped || abort.signal.aborted || !this.wanted.has(c.id))
            this.dispose(v);
          else this.ready.set(c.id, v);
        })
        .catch((e) => {
          if (!abort.signal.aborted) {
            this.stats.errors++;
            this.failed(e);
          }
        })
        .finally(() => {
          if (this.pending.get(c.id) === abort) this.pending.delete(c.id);
        });
    }
  }
  get settled() {
    return !this.queue.length && !this.pending.size && !this.ready.size;
  }
  close() {
    this.stopped = true;
    for (const a of this.pending.values()) a.abort();
    for (const v of [...this.active.values(), ...this.ready.values()])
      this.dispose(v);
    this.active.clear();
    this.ready.clear();
    this.pending.clear();
    this.queue = [];
  }
}
