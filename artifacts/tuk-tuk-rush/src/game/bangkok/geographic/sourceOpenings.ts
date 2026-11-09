import type { GeographicChunkData } from "./dataset";
import type { Facade } from "./chinatownFacades";
import { renaissanceFrontage } from "./renaissancePlan";
/** Only visual wall indices are omitted. Pinned source body, footprints, IDs,
 * roof triangles and collision edges are never changed. The worker substitutes
 * a complete opening-aware wall grammar on those exact source edges. */
export function prepareSourceOpenings(
  chunk: GeographicChunkData,
  facades: Facade[],
) {
  const data = chunk.buildingGeometry,
    selected = facades.filter(renaissanceFrontage);
  if (!data || !selected.length) return;
  const grid = new Map<string, Facade[]>();
  for (const f of selected) {
    const ax = f.edge.a[0],
      az = f.edge.a[1],
      bx = f.edge.b[0],
      bz = f.edge.b[1];
    for (
      let x = Math.floor(Math.min(ax, bx) / 32);
      x <= Math.floor(Math.max(ax, bx) / 32);
      x++
    )
      for (
        let z = Math.floor(Math.min(az, bz) / 32);
        z <= Math.floor(Math.max(az, bz) / 32);
        z++
      ) {
        const key = `${x}:${z}`,
          list = grid.get(key) ?? [];
        list.push(f);
        grid.set(key, list);
      }
  }
  data.frontageIndices = {};
  let omitted = 0;
  data.batches.forEach((batch, bi) => {
    const a = batch.attributes.find((a) => a.name === "position")!,
      p = new Float32Array(data.body, a.offset, a.count),
      idx = batch.index,
      original =
        idx.width === 2
          ? new Uint16Array(data.body, idx.offset, idx.count)
          : new Uint32Array(data.body, idx.offset, idx.count),
      kept: number[] = [];
    for (let i = 0; i < original.length; i += 3) {
      const ia = original[i]!,
        ib = original[i + 1]!,
        ic = original[i + 2]!;
      const candidates = grid.get(
        `${Math.floor((p[ia * 3]! + p[ib * 3]! + p[ic * 3]!) / 96)}:${Math.floor((p[ia * 3 + 2]! + p[ib * 3 + 2]! + p[ic * 3 + 2]!) / 96)}`,
      );
      if (!candidates) {
        kept.push(ia, ib, ic);
        continue;
      }
      const ids = [ia, ib, ic],
        ys = ids.map((v) => p[v * 3 + 1]!);
      const low = Math.min(...ys),
        high = Math.max(...ys);
      const remove =
        high - low > 0.05 &&
        candidates.some((f) => {
          if (high > f.height + 0.03) return false;
          const fx = f.x - chunk.origin[0],
            fz = f.z - chunk.origin[1];
          return ids.every((id) => {
            const dx = p[id * 3]! - fx,
              dz = p[id * 3 + 2]! - fz;
            return (
              Math.abs(dx * f.nx + dz * f.nz) < 0.065 &&
              Math.abs(dx * f.nz - dz * f.nx) <= f.width / 2 + 0.025
            );
          });
        });
      if (remove) omitted++;
      else kept.push(ia, ib, ic);
    }
    if (kept.length !== original.length)
      data.frontageIndices![bi] =
        idx.width === 2 ? new Uint16Array(kept) : new Uint32Array(kept);
  });
  return omitted;
}
