import { loadGeographicChunk } from './dataset';
import { prepareGeographicChunk, chunkTransferables } from './chunkPreparation';
import type { ChunkReference } from './streaming';
self.onmessage = async (event: MessageEvent<ChunkReference>) => {
  try {
    const chunk = prepareGeographicChunk(await loadGeographicChunk(event.data));
    self.postMessage({ chunk }, { transfer: chunkTransferables(chunk) });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
