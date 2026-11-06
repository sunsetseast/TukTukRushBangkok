import type { GeographicChunkData } from './dataset';
import type { ChunkReference } from './streaming';
/** Matches the stream's two-request limit. Abort terminates only that job's
 * worker (including fetch/decode/triangulation); late results cannot install.
 * Successful workers are reused; close releases every worker and handler. */
export class GeographicChunkLoader {
  private slots: { worker: Worker; busy: boolean; cancel?: () => void }[] = [];
  private closed = false;
  load(ref: ChunkReference, signal: AbortSignal): Promise<GeographicChunkData> {
    if (this.closed || signal.aborted) return Promise.reject(new DOMException('Chunk cancelled', 'AbortError'));
    let slot = this.slots.find(s => !s.busy);
    if (!slot) {
      if (this.slots.length >= 2) return Promise.reject(Error('Geographic worker queue exceeded'));
      slot = { worker: new Worker(new URL('./chunk.worker.ts', import.meta.url), { type: 'module' }), busy: false };
      this.slots.push(slot);
    }
    const job = slot;
    job.busy = true;
    return new Promise((resolve, reject) => {
      const finish = (discard = false) => {
        signal.removeEventListener('abort', abort);
        job.worker.onmessage = null;
        job.worker.onerror = null;
        job.cancel = undefined;
        job.busy = false;
        if (discard) {
          job.worker.terminate();
          this.slots = this.slots.filter(s => s !== job);
        }
      };
      const abort = () => { finish(true); reject(new DOMException('Chunk cancelled', 'AbortError')); };
      job.cancel = abort;
      signal.addEventListener('abort', abort, { once: true });
      job.worker.onerror = event => { finish(true); reject(Error(`Bangkok chunk worker failed (${ref.id}): ${event.message}`)); };
      job.worker.onmessage = (event: MessageEvent<{ chunk?: GeographicChunkData; error?: string }>) => {
        finish();
        if (event.data.chunk) resolve(event.data.chunk);
        else reject(Error(event.data.error ?? `Invalid Bangkok chunk worker response (${ref.id})`));
      };
      job.worker.postMessage(ref);
    });
  }
  close() {
    this.closed = true;
    for (const s of [...this.slots]) {
      if (s.cancel) s.cancel();
      else s.worker.terminate();
    }
    this.slots = [];
  }
}
