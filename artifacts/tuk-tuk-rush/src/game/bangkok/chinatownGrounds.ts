import * as T from "three";
import baked from "./chinatownBlocks.generated.json";
import { surfaceGeometry, type RoadPolygons } from "./roadSurfaceGraph";
import { pavingMaterial } from "./streetSurfaces";
import type { District, Obstacle } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import {
  pedestrianPassages,
  clearsPedestrianPassages,
} from "./chinatownBlocks";
import { placementIndex } from "./environmentPlan";
/** Ground is the exact approved block polygon with its holes. It cannot bridge
 * the river, fill a protected forecourt, or cover the buffered live lanes. */
export function buildChinatownGround() {
  const material = pavingMaterial();
  material.color.set("#b2a994");
  const mesh = new T.Mesh(
    surfaceGeometry(baked.polygons as RoadPolygons, -0.115),
    material,
  );
  mesh.name = "ChinatownBlockCourtyards";
  return mesh;
}
const cache = new WeakMap<District, Obstacle[]>();
export function planChinatownPassagePosts(d: District) {
  const old = cache.get(d);
  if (old) return old;
  const posts: Obstacle[] = [],
    index = placementIndex(d);
  const passages = pedestrianPassages();
  for (const [i, p] of passages.entries()) {
    // The post pairs mark pedestrian entrances and stay outside the road's
    // maneuver envelope. Pedestrians retain 1.2m; a tuk-tuk cannot use the lane
    // as an invented traffic shortcut.
    if (i && passages[i - 1]!.id === p.id) continue;
    const len = Math.hypot(p.b.x - p.a.x, p.b.z - p.a.z),
      nx = (p.b.z - p.a.z) / len,
      nz = -(p.b.x - p.a.x) / len;
    for (const side of [-1, 1]) {
      const o: Obstacle = {
        x: p.a.x + nx * side * 0.85,
        z: p.a.z + nz * side * 0.85,
        w: 0.4,
        d: 0.4,
        height: 1.1,
        color: "#827b64",
        artRole: "furniture",
        environmentId: `chinatown-passage:${p.id}:${side}`,
      };
      if (!index.clear(o, true)) continue;
      posts.push(o);
      d.obstacles.push(o);
      index.insert(o);
    }
  }
  cache.set(d, posts);
  return posts;
}
export function emitChinatownGroundDetails(
  d: District,
  emit: (o: ArtPiece) => void,
) {
  for (const p of pedestrianPassages())
    emit({
      x: (p.a.x + p.b.x) / 2,
      z: (p.a.z + p.b.z) / 2,
      y: 0.025,
      w: p.width,
      d: Math.hypot(p.b.x - p.a.x, p.b.z - p.a.z),
      h: 0.08,
      yaw: Math.atan2(p.b.x - p.a.x, p.b.z - p.a.z),
      color: "#9c9d89",
      surface: "concrete",
      layer: "core",
    });
  for (const p of planChinatownPassagePosts(d))
    emit({
      x: p.x,
      z: p.z,
      y: p.height / 2,
      w: p.w,
      h: p.height,
      d: p.d,
      yaw: 0,
      color: p.color,
      surface: "metal",
      shape: "cylinder",
      layer: "core",
      siteId: p.environmentId,
    });
}
