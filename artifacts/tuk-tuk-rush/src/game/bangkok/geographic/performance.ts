/** Local-only frame sampling for physical iPhone Safari profiling.
 * Raw requestAnimationFrame timestamps (not simulation dt or an FPS estimate)
 * reveal stalls; no telemetry is uploaded or persisted. */
export class GeographicFrameProfiler {
  private readonly frames: number[];
  private last = 0;
  private index = 0;
  private count = 0;

  constructor(private readonly capacity = 180) {
    if (!Number.isInteger(capacity) || capacity < 3) throw Error("Invalid frame window");
    this.frames = new Array<number>(capacity);
  }

  reset() {
    this.last = 0;
    this.index = 0;
    this.count = 0;
  }

  record(nowMs: number, visible = true) {
    if (!visible || !Number.isFinite(nowMs)) {
      this.last = 0;
      return;
    }
    if (this.last > 0) {
      const ms = nowMs - this.last;
      // Ignore suspended tabs / time going backwards; report actual driving frames.
      if (ms > 0 && ms < 2000) {
        this.frames[this.index] = ms;
        this.index = (this.index + 1) % this.capacity;
        this.count = Math.min(this.count + 1, this.capacity);
      }
    }
    this.last = nowMs;
  }

  snapshot() {
    const values = this.frames.slice(0, this.count).sort((a, b) => a - b);
    const pick = (q: number) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * q))] ?? 0;
    const medianMs = pick(0.5), p95Ms = pick(0.95);
    return {
      samples: values.length,
      medianMs,
      p95Ms,
      worstMs: values.at(-1) ?? 0,
      approxFps: medianMs > 0 ? 1000 / medianMs : 0,
      framesOver50Ms: values.filter((ms) => ms > 50).length,
    };
  }
}
export type GeographicPerfSample = ReturnType<GeographicFrameProfiler["snapshot"]> & {
  drawCalls: number;
  triangles: number;
  geometries: number;
  activeChunks: number;
  pendingChunks: number;
  queuedChunks: number;
  readyChunks: number;
  residentBuildings: number;
  maxChunkActivationMs: number;
  quality: "low" | "medium";
  streamErrors: number;
};
