import type { Obstacle, Point } from "../types";
import { rectangleBoundary } from "./landmarkParcels";

const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
export function pointInRing(p: Point, ring: Point[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
/** Corners alone miss concave notches and a hole completely under a building.
 * Reject boundary crossings and enclosed hole vertices as well. */
export function footprintInBlock(
  o: Pick<Obstacle, "x" | "z" | "w" | "d" | "yaw">,
  block: { boundary: Point[]; holes: Point[][] },
) {
  const box = rectangleBoundary(o);
  if (
    !box.every(
      (p) =>
        pointInRing(p, block.boundary) &&
        !block.holes.some((h) => pointInRing(p, h)),
    )
  )
    return false;
  for (const ring of [block.boundary, ...block.holes]) {
    if (ring.some((p) => pointInRing(p, box))) return false;
    for (let i = 0; i < box.length; i++)
      for (let j = 0; j < ring.length; j++) {
        const a = box[i]!,
          b = box[(i + 1) % box.length]!,
          c = ring[j]!,
          d = ring[(j + 1) % ring.length]!;
        if (
          cross(a, b, c) * cross(a, b, d) < -1e-8 &&
          cross(c, d, a) * cross(c, d, b) < -1e-8
        )
          return false;
      }
  }
  return true;
}
