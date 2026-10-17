import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { accessPoint, arrivalPortal } from "./destinationAccess";

/** Outer visitor environments are authored around real graph loops. Tile courts,
 * temple galleries, garden islands and retail canopies are separate from roads. */
export function emitDestinationGrounds(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  for (const a of d.destinations ?? []) {
    const temple = a.kind === "temple" || a.kind === "palace",
      mall = a.kind === "mall";
    const put = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      shape: ArtPiece["shape"] = "box",
      layer: ArtPiece["layer"] = "core",
      yaw = 0,
    ) => {
      const p = accessPoint(a, x, z);
      emit({
        ...p,
        y,
        w,
        h,
        d: depth,
        color,
        shape,
        layer,
        yaw: a.yaw + yaw,
        surface: y < 0.2 ? "concrete" : temple ? "plaster" : "concrete",
      });
    };
    const plot = d.landmarks.find((l) => l.id === a.landmarkId)!.plot!,
      length = Math.hypot(plot.x - a.origin.x, plot.z - a.origin.z);
    // A paved pedestrian approach closes the cleared sightline. It sits below
    // asphalt and ends behind physical bollards, rather than becoming another road.
    put(
      0,
      0.04,
      (23 + length) / 2,
      12,
      0.06,
      Math.max(1, length - 23),
      "#c6b993",
    );
    for (const x of [-4, -1.3, 1.3, 4])
      put(x, 0.7, 25, 0.25, 1, 0.25, "#b69c76", "cylinder");
    // Ground beneath roads, never a differently shaded polygon laid over asphalt.
    put(0, 0.05, 0, 57, 0.08, 53, temple ? "#c4bb9d" : "#b0bbba");
    put(0, 0.62, 0, 16, 1.1, 8, temple ? "#e2d5b5" : "#ded4bd");
    put(0, 1.2, 0, 14, 0.1, 6, "#548565");
    for (const side of [-1, 1]) {
      put(side * 28, 1.3, 0, 1, 2.4, 42, temple ? "#eadfc5" : "#899d98");
      put(side * 28, 2.7, 0, 1.3, 0.3, 43, temple ? "#ba684d" : "#ddc797");
      for (let z = -18; z <= 18; z += 9) {
        put(side * 28, 1.9, z, 1.6, 3.6, 1.6, temple ? "#e9d7aa" : "#acbbb3");
        put(
          side * 28,
          4,
          z,
          temple ? 2.1 : 1.7,
          0.6,
          2.1,
          temple ? "#d5b465" : "#eee2bc",
          "gable",
        );
      }
      // Slender covered galleries beside, not across, the visitor lanes.
      for (let z = -12; z <= 12; z += 6)
        put(side * 25, 2.8, z, 0.28, 5, 0.28, "#e5cc95");
      put(side * 25, 5.5, 0, 4.2, 0.4, 28, temple ? "#a14337" : "#d1bd8c");
      if (temple)
        put(
          side * 25,
          6.9,
          0,
          5,
          2.6,
          29,
          a.id === "pho" ? "#437969" : "#ab4a35",
          "gable",
        );
      for (const z of [-3, 3]) {
        put(side * 5, 2.7, z, 0.45, 5, 0.45, "#8e7660", "cylinder");
        put(side * 5, 5.2, z, 5, 3, 5, temple ? "#668e68" : "#66967b", "orb");
      }
      put(side * 9, 1.5, 0, 0.3, 1, 0.3, "#796e61");
      put(side * 9, 3.4, 0, 0.5, 4, 0.5, "#8b806e");
      put(side * 9, 5.6, 0, 1.1, 0.7, 1.1, "#e9c386", "box", "night");
    }
    // Entrance portals follow the ACTUAL driveway tangent, including oblique gates.
    const g = arrivalPortal(d, a);
    if (g) {
      const c = Math.cos(g.yaw),
        s = Math.sin(g.yaw);
      const gate = (
        x: number,
        y: number,
        w: number,
        h: number,
        depth: number,
        color: string,
        shape: ArtPiece["shape"] = "box",
        layer: ArtPiece["layer"] = "core",
      ) =>
        emit({
          x: g.x + c * x,
          z: g.z - s * x,
          y,
          w,
          h,
          d: depth,
          color,
          shape,
          layer,
          yaw: g.yaw,
          surface: temple ? "tile" : "metal",
        });
      for (const side of [-1, 1]) {
        gate(
          side * g.halfSpan,
          3.5,
          1.7,
          7,
          1.7,
          temple ? "#e4d4af" : "#929c99",
        );
        gate(side * g.halfSpan, 6.8, 2.5, 0.6, 2.5, "#d6b56f");
      }
      gate(0, 7.6, 19, 1.1, 2.8, temple ? "#b69654" : "#c2b28c");
      if (temple) {
        gate(0, 9.3, 22, 3, 5, a.id === "pho" ? "#42786a" : "#ad4c39", "gable");
        gate(0, 11.6, 16, 2.2, 3.8, "#dbbf6c", "gable");
      } else gate(0, 8.4, 20, 0.4, 6, "#e2c88e");
      gate(0, 7.6, 10, 0.55, 0.08, "#f4d998", "box", "night");
    }
    if (mall) {
      // Open sided drop-off canopy; clear underside >7m, no ground collider slab.
      // Covered passenger edges flank an open/louvred central oculus, keeping
      // the mall's upper facade visible from the stopped tuk-tuk camera.
      for (const side of [-1, 1]) {
        put(
          side * 11,
          7.7,
          14,
          7,
          0.7,
          13,
          a.id === "icon" ? "#d7b461" : "#c9cfc5",
        );
        put(side * 11, 7.3, 14, 6, 0.08, 10, "#f4c997", "box", "night");
      }
      for (const z of [8, 14, 20]) put(0, 8.2, z, 30, 0.3, 0.35, "#ecdbaf");
      for (const x of [-13, 13]) put(x, 3.8, 22, 0.6, 7.3, 0.6, "#c6b58b");
      for (let x = -12; x <= 12; x += 4)
        put(x, 0.24, 20, 0.12, 0.04, 5, "#e9dec0");
    }
    // Arrival curb stripe, bollards and parking cues face the one-way circulation.
    for (const x of [-10, -6, 6, 10])
      put(x, 0.7, 22, 0.25, 1, 0.25, "#b69c76", "cylinder");
    put(0, 0.25, 21, 10, 0.04, 0.3, "#efdaa1");
    put(0, 1.1, 23, 3.5, 2, 0.25, "#435968");
    put(0, 1.1, 23.15, 3.2, 1.5, 0.02, "#e1c999", "box", "night");
    if (a.id === "arun" || a.id === "pho")
      for (const x of [-23, 23]) {
        put(x, 1.6, 23, 4, 3, 4, "#e6d9b8");
        put(x, 4.4, 23, 2.8, 3, 2.8, "#c4b380", "gable");
        put(x, 7.4, 23, 0.3, 3, 0.3, "#dcb66b");
      }
    if (a.kind === "waterfront") {
      for (const side of [-1, 1]) {
        put(side * 25, 4, 0, 5, 7, 29, "#a87b5c");
        put(side * 25, 8, 0, 6, 2, 30, "#804c43", "gable");
      }
    }
  }
}
