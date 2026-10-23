import { chinatownHeritageArt } from "./chinatownHeritage";
import { victoryMonument } from "./victoryMonument";
import { buildRealArchitecture } from "./realArchitecture";
import { realCommercial } from "./realCommercial";
import { reviewedLandmark } from "./landmarkSites";
import { heritageLandmark } from "./heritageLandmarks";
import { buddhaLandmark } from "./buddhaLandmarks";
import { skylineLandmark } from "./skylineLandmarks";
import * as T from "three";
import type { Landmark } from "../types";
import { LandmarkBuilder } from "./landmarkBuilder";

/** Site-specific original arcade assets; proportions compress the real places. */
export function sculptedLandmark(l: Landmark) {
  const special =
    chinatownHeritageArt(l) ??
    victoryMonument(l) ??
    buildRealArchitecture(l) ??
    realCommercial(l) ??
    reviewedLandmark(l) ??
    buddhaLandmark(l) ??
    heritageLandmark(l) ??
    skylineLandmark(l);
  if (special) return special;
  if (l.id !== "paragon") return;
  const b = new LandmarkBuilder(),
    S = l.size ?? 65;
  if (l.id === "paragon") {
    b.box(0, 0.6, 0, 64, 1.2, 64, "#c6c9bd");
    b.box(0, 15, 4, 58, 29, 52, "#bdc6bd");
    for (const side of [-1, 1])
      for (let x = -27; x <= 27; x += 3) {
        b.box(x, 15, side * 30, 2.75, 25, 0.25, "#648d96");
        b.box(x - 1.4, 15, side * 30.2, 0.15, 27, 0.2, "#bccfc4");
      }
    for (let i = 0; i < 3; i++)
      b.box(0, 5 + i * 9, -31, 60, 0.4, 1, "#dae0d1", 0, true);
    b.box(0, 7, -30, 23, 13, 5, "#729ea1");
    // Faceted jewel entrance: alternating triangular glazing planes.
    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 5,
        geo = new T.BufferGeometry();
      geo.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [x - 2.5, 0, 0, x + 2.5, 0, 0, x + 2, 6, -3, x - 2, 6, -3],
          3,
        ),
      );
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      b.shape(geo, 0, 11, -32.5, i % 2 ? "#c2d7c6" : "#679c9d");
    }
    b.box(0, 7, -32.7, 19, 10, 0.3, "#557c81");
    b.box(0, 12.2, -33, 23, 0.35, 4, "#dcc9a2", 0, true);
    for (const side of [-1, 1]) {
      for (let z = -20; z <= 26; z += 3)
        b.box(side * 29.15, 15, z, 0.3, 25, 2.7, "#6d969d");
      for (let y = 5; y <= 23; y += 9)
        b.box(side * 29.4, y, 4, 0.4, 0.35, 52, "#d9dfcf", 0, true);
    }
  }
  for (const side of [-1, 1])
    for (let x = -25; x <= 25; x += 5) {
      b.box(x, 2, side * 30.8, 3.8, 0.4, 0.8, "#a7b9ab");
      b.box(x, 3.7, side * 30.9, 0.1, 3, 0.12, "#e0dcc5");
    }
  return b.finish(`refined-${l.id}-commercial-v3`);
}
