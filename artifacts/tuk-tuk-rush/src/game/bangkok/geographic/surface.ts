import type { GeographicDataset, GeographicWay } from "./dataset";
import type { World } from "./projection";
import { distanceToSegment } from "../../world";
type Segment = {
  a: World;
  b: World;
  ya: number;
  yb: number;
  way: GeographicWay;
};
/** Persistent physical source surfaces; visual chunk eviction cannot change deck access.
 * Source-node heights are an explicitly estimated datum/ramp, never a surveyed DEM.
 */
export class GeographicSurface {
  private cells = new Map<string, Segment[]>();
  constructor(data: GeographicDataset) {
    for (const r of data.roads) {
      if (
        r.tunnel ||
        !r.vehicleClearance ||
        r.tags.highway === "steps" ||
        r.tags.area === "yes"
      )
        continue;
      const profiles=r.profiles??r.nodes.slice(1).map((id,i)=>[
        [...data.nodes[r.nodes[i]!]!,r.heights[i]??0],
        [...data.nodes[id]!,r.heights[i+1]??0],
      ]);
      for(const profile of profiles)for(let i=1;i<profile.length;i++){
        const a=profile[i-1]!,b=profile[i]!,segment={
          a:{x:a[0]!,z:a[1]!},b:{x:b[0]!,z:b[1]!},ya:a[2]!,yb:b[2]!,way:r,
        };
        const margin = r.width / 2 + 3;
        for (
          let x = Math.floor((Math.min(a[0], b[0]) - margin) / 128);
          x <= Math.floor((Math.max(a[0], b[0]) + margin) / 128);
          x++
        )
          for (
            let z = Math.floor((Math.min(a[1], b[1]) - margin) / 128);
            z <= Math.floor((Math.max(a[1], b[1]) + margin) / 128);
            z++
          ) {
            const key = `${x}:${z}`;
            if (!this.cells.has(key)) this.cells.set(key, []);
            this.cells.get(key)!.push(segment);
          }
      }
    }
  }
  sample(p: World, previousHeight = 0) {
    let best: { height: number; road: string; distance: number } | undefined;
    for (const s of this.cells.get(
      `${Math.floor(p.x / 128)}:${Math.floor(p.z / 128)}`,
    ) ?? []) {
      const q = distanceToSegment(p, s.a, s.b);
      if (q.distance > s.way.width / 2 - 1.5) continue;
      const length = Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z),
        f = length
          ? Math.hypot(q.point.x - s.a.x, q.point.z - s.a.z) / length
          : 0,
        height = s.ya * (1 - f) + s.yb * f;
      // An overpass at the same X/Z cannot pull a ground vehicle onto its deck.
      if (Math.abs(height - previousHeight) > 0.65) continue;
      if (!best || q.distance < best.distance)
        best = { height, road: s.way.id, distance: q.distance };
    }
    return best;
  }
}
