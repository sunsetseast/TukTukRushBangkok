import type { GeographicPerfSample } from "./performance";

export function GeographicPerformanceOverlay({
  sample,
  onClose,
}: {
  sample?: GeographicPerfSample;
  onClose: () => void;
}) {
  const n = (value: number | undefined, digits = 0) =>
    value === undefined ? "—" : value.toFixed(digits);
  const underBudget = !!sample && sample.samples >= 30 && sample.p95Ms <= 33.33;
  return (
    <aside className="geo-perf" data-testid="geographic-performance" data-samples={sample?.samples ?? 0} aria-label="Real-scale Bangkok device performance">
      <header>
        <strong>DEVICE PERFORMANCE</strong>
        <button type="button" onClick={onClose} aria-label="Close performance monitor">×</button>
      </header>
      <div className="geo-perf-lead">
        <b>{n(sample?.approxFps, 1)} FPS</b>
        <span>{sample && sample.samples >= 30 ? underBudget ? "30 FPS frame budget met" : "Below 30 FPS frame budget" : "Measuring…"}</span>
      </div>
      <dl>
        <dt>Frame p50 / p95</dt><dd>{n(sample?.medianMs, 1)} / {n(sample?.p95Ms, 1)} ms</dd>
        <dt>Worst frame</dt><dd>{n(sample?.worstMs, 1)} ms</dd>
        <dt>Frames over 50 ms</dt><dd>{sample?.framesOver50Ms ?? "—"} / {sample?.samples ?? "—"}</dd>
        <dt>Draw calls / triangles</dt><dd>{sample ? `${sample.drawCalls} / ${sample.triangles.toLocaleString()}` : "—"}</dd>
        <dt>GPU geometries</dt><dd>{sample?.geometries ?? "—"}</dd>
        <dt>Chunks active / waiting</dt><dd>{sample ? `${sample.activeChunks} / ${sample.pendingChunks + sample.readyChunks + sample.queuedChunks}` : "—"}</dd>
        <dt>Resident buildings</dt><dd>{sample?.residentBuildings.toLocaleString() ?? "—"}</dd>
        <dt>Worst chunk install</dt><dd>{n(sample?.maxChunkActivationMs, 1)} ms</dd>
        <dt>Chinatown facades / buffers</dt><dd>{sample ? `${sample.decorativeFacades ?? 0} / ${((sample.decorativeBufferBytes ?? 0)/1048576).toFixed(2)} MiB` : '—'}</dd>
        <dt>Stream errors</dt><dd>{sample?.streamErrors ?? "—"}</dd>
        <dt>Graphics quality</dt><dd>{sample?.quality ?? "—"}</dd>
      </dl>
      <small>
        Rolling frame window (up to 180 frames); FPS is estimated from median frame time.
        Draw-call counters reflect the last completed frame. No iPhone thermal,
        true GPU memory or device-wide RAM measurements are available here.
        Nothing is uploaded. Run a sustained drive, not just the title screen.
      </small>
    </aside>
  );
}
