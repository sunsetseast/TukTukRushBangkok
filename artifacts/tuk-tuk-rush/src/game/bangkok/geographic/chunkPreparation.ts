import {prepareChinatown} from './chinatownFacades';
import type { GeographicChunkData } from './dataset';
import { surfaceGeometry } from '../roadSurfaceGraph';
import { buildingObstacles } from './buildings';
/** Runs off the UI thread. Transferable arrays retain the exact shared triangulator,
 * source identities, winding, bridge levels and collision edge policy. */
export function prepareGeographicChunk(chunk: GeographicChunkData) {
  const started = performance.now();
  chunk.preparedSurfaces = {};
  for (const kind of ['land', 'water', 'roads'] as const) {
    const g = surfaceGeometry(chunk[kind], kind === 'land' ? -.25 : kind === 'water' ? -.48 : .1);
    chunk.preparedSurfaces[kind] = {
      position: g.getAttribute('position').array as Float32Array,
      normal: g.getAttribute('normal').array as Float32Array,
      uv: g.getAttribute('uv').array as Float32Array,
    };
    g.dispose();
  }
  chunk.decoration = prepareChinatown(chunk);
  chunk.preparedColliders = buildingObstacles(chunk.buildings ?? [], chunk.origin);
  if (chunk.timing) chunk.timing.preparationMs = performance.now() - started;
  return chunk;
}
export function chunkTransferables(chunk: GeographicChunkData): ArrayBuffer[] {
  return [...new Set([
    ...(chunk.decoration?.batches.flatMap(b => [...Object.values(b.attributes).map(a=>a.array.buffer), ...(b.index?[b.index.buffer]:[]), ...(b.matrices?[b.matrices.buffer]:[]), ...(b.colors?[b.colors.buffer]:[])]) as ArrayBuffer[] ?? []),
    ...(chunk.buildingGeometry ? [chunk.buildingGeometry.body] : []),
    ...Object.values(chunk.preparedSurfaces ?? {}).flatMap(s =>
      [s.position.buffer, s.normal.buffer, s.uv.buffer] as ArrayBuffer[]),
  ])];
}
