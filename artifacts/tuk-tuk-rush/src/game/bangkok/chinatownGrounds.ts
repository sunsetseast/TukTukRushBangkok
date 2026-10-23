import * as T from "three";
import baked from "./chinatownBlocks.generated.json";
import { surfaceGeometry, type RoadPolygons } from "./roadSurfaceGraph";
import { pavingMaterial } from "./streetSurfaces";
import type { District, Obstacle } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import {
  planChinatownBlocks,
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
  for (const block of planChinatownBlocks(d))
    for (const yard of block.courts) {
      const b = yard.body,
        c = Math.cos(b.yaw ?? 0),
        s = Math.sin(b.yaw ?? 0);
      const put = (
        u: number,
        y: number,
        v: number,
        w: number,
        h: number,
        depth: number,
        color: string,
        surface: ArtPiece["surface"] = "concrete",
        shape: ArtPiece["shape"] = "box",
        layer: ArtPiece["layer"] = "core",
      ) =>
        emit({
          x: b.x + c * u + s * v,
          z: b.z - s * u + c * v,
          y,
          w,
          h,
          d: depth,
          yaw: b.yaw ?? 0,
          color,
          surface,
          shape,
          layer,
          siteId: yard.id,
        });
      put(0, 0.015, 0, b.w, 0.08, b.d, b.color);
      put(
        0,
        0.065,
        -b.d / 2 + 0.2,
        b.w - 0.8,
        0.05,
        0.25,
        "#69776d",
        "metal",
        "box",
        "near",
      );
      put(0, 0.075, 1.8, 3.8, 0.05, 2.1, "#a49a81", "concrete", "box", "near");
      for (const f of yard.fixtures)
        emit({
          x: f.x,
          z: f.z,
          y: f.height / 2,
          w: f.w,
          h: f.height,
          d: f.d,
          yaw: f.yaw ?? 0,
          color: f.color,
          surface: yard.use === "workshop-court" ? "metal" : "plaster",
          layer: "core",
          siteId: f.environmentId,
        });
      // Crates, potted frangipani/understory and work equipment sit against the
      // court edge, keeping its central circulation visibly open.
      if (yard.use === "workshop-court") {
        put(
          -b.w / 2 + 1.5,
          1.7,
          -1.4,
          1.1,
          0.65,
          1.1,
          "#97a294",
          "metal",
          "cylinder",
          "near",
        );
        put(
          b.w / 2 - 1.5,
          1.6,
          -1.4,
          0.8,
          0.8,
          0.8,
          "#4d6354",
          "metal",
          "orb",
          "near",
        );
      } else {
        put(
          -b.w / 2 + 1.3,
          0.45,
          2,
          1.4,
          0.9,
          1.4,
          "#ad8255",
          "wood",
          "box",
          "near",
        );
        put(
          b.w / 2 - 1.3,
          0.5,
          2,
          1,
          1,
          1,
          "#9b7457",
          "plaster",
          "cylinder",
          "near",
        );
        put(
          b.w / 2 - 1.3,
          1.55,
          2,
          1.8,
          1.9,
          1.8,
          "#68866a",
          "plaster",
          "orb",
          "near",
        );
      }
    }
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
