import * as T from "three";
import { facadeFinishes, installFacadeFinish } from "./facadeFinish";
import type { Landmark } from "../types";
import { ArchitecturalBatch } from "./architecturalBatch";
/** Reference-informed arcade compositions. Plot envelopes are the authority;
 * these are not dimensioned replicas, branded storefronts or copied logos. */
export function buildCommercialLandmark(
  l: Landmark,
  finishes = facadeFinishes(),
) {
  const root = new T.Group(),
    size = l.size ?? 65,
    mat = new T.MeshStandardMaterial({
      map: finishes.albedo,
      normalMap: finishes.normal,
      normalScale: new T.Vector2(0.28, 0.28),
      roughnessMap: finishes.pbr,
      metalnessMap: finishes.pbr,
      vertexColors: true,
      roughness: 1,
      metalness: 1,
    }),
    lit = new T.MeshStandardMaterial({
      vertexColors: true,
      emissive: "#f7cc8e",
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      roughness: 0.4,
    });
  installFacadeFinish(mat);
  const batch = new ArchitecturalBatch(mat, lit),
    S = size / 65;
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    night = false,
    yaw = 0,
  ) =>
    batch.add({
      x: x * S,
      y: y * S,
      z: z * S,
      w: w * S,
      h: h * S,
      d: d * S,
      color,
      yaw,
      surface: night
        ? "panel"
        : [
              "#416778",
              "#456f7b",
              "#507684",
              "#477686",
              "#537e8c",
              "#7196b6",
            ].includes(color)
          ? "panel"
          : ["#d0b581", "#d7b768", "#d9bd84"].includes(color)
            ? "metal"
            : "concrete",
      layer: night ? "night" : "core",
    });
  if (l.id === "icon") {
    // Stepped golden retail terraces, two offset roof crowns and a full-height
    // river-facing glass cabinet. Four articulated faces read from road approaches.
    box(0, 6.5, 0, 64, 13, 64, "#cbbd99");
    box(-2, 16, -3, 57, 10, 55, "#8bafb6");
    box(-5, 24, -5, 47, 7, 45, "#e1c18b");
    for (const side of [-1, 1]) {
      for (let f = 0; f < 3; f++) {
        box(
          side * (32.2 - f * 2.8),
          6 + f * 8,
          -f * 2,
          0.5,
          5.4,
          57 - f * 5,
          "#416778",
        );
        box(
          side * (32.48 - f * 2.8),
          6 + f * 8,
          -f * 2,
          0.02,
          4.7,
          55 - f * 5,
          "#d5bd8a",
          true,
        );
        box(
          -f * 2,
          6 + f * 8,
          side * (32.2 - f * 2.8),
          57 - f * 5,
          5.4,
          0.5,
          "#456f7b",
        );
        box(
          -f * 2,
          6 + f * 8,
          side * (32.48 - f * 2.8),
          55 - f * 5,
          4.7,
          0.02,
          "#c6b690",
          true,
        );
        box(
          -f * 2,
          9.2 + f * 8,
          side * (30.8 - f * 2.8),
          60 - f * 5,
          0.6,
          2.1,
          "#d7b768",
        );
      }
    }
    for (const side of [-1, 1])
      for (let n = 0; n < 9; n++) {
        box((n - 4) * 7, 9, side * 32.4, 0.35, 15, 0.18, "#d0b581");
        box(side * 32.4, 9, (n - 4) * 7, 0.18, 15, 0.35, "#d0b581");
      }
    for (const x of [-16, 12]) {
      batch.add({
        x: x * S,
        y: 27 * S,
        z: -5 * S,
        w: 20 * S,
        h: 6 * S,
        d: 33 * S,
        color: "#d8b166",
        yaw: 0,
        shape: "gable",
        surface: "metal",
      });
    }
    for (const side of [-1, 1]) {
      box(0, 2.9, side * 32.2, 15, 5.7, 0.5, "#2c5663");
      box(0, 6.5, side * 30.6, 22, 0.6, 3.5, "#d8b36b");
    }
  } else {
    const paragon = l.id === "paragon";
    box(0, 7, 0, 64, 14, 64, "#c9d3d1");
    box(paragon ? -7 : 3, 18, -6, paragon ? 46 : 52, 15, 46, "#7298a5");
    for (const side of [-1, 1]) {
      box(0, 6, side * 32.2, 58, 9, 0.5, "#396374");
      box(0, 18, side * 25.1, paragon ? 43 : 48, 11, 1, "#5c8491");
      for (let n = 0; n < 7; n++)
        box((n - 3) * 8, 10, side * 31.9, 0.6, 15, 0.4, "#e4d5b1");
      box(0, 11.2, side * 31, 63, 0.6, 3, "#e2d4b5");
      box(0, 25.5, side * 25, 54, 0.7, 4.4, "#dbc29e");
      box(0, 5, side * 32.48, 52, 7, 0.02, "#a5c7c7", true);
    }
    if (paragon) {
      // An offset vaulted entrance, rather than a flat sign stuck to a cube.
      batch.add({
        x: -6 * S,
        y: 13 * S,
        z: 31 * S,
        w: 23 * S,
        h: 12 * S,
        d: 1.5 * S,
        color: "#d4be85",
        yaw: 0,
        shape: "arch",
        surface: "metal",
      });
      box(-6, 5, 31.5, 15, 10, 0.4, "#335967");
      box(-6, 12, 31.7, 22, 0.45, 0.5, "#f3d291", true);
    } else {
      box(16, 18, 26.5, 15, 9, 0.55, "#2c5677");
      box(16, 18, 26.85, 13.5, 7.5, 0.1, "#659ca7", true);
      for (let i = 0; i < 5; i++)
        box(-18 + i * 6, 27 + i * 0.3, 0, 4, 3 + i * 0.6, 26, "#aebbbb");
    }
    // Side elevation has glazing strips and structural ribs, not empty plaster.
    for (const side of [-1, 1]) {
      box(side * 31.5, 6, 0, 0.9, 8, 56, "#5f8390");
      for (let n = 0; n < 7; n++)
        box(side * 32, 9, (n - 3) * 8, 0.4, 13, 0.6, "#d6c7a9");
    }
  }
  for (const chunk of batch.finish()) {
    chunk.name = "LandmarkArt";
    root.add(chunk);
  }
  root.userData.nightMaterial = lit;
  return root;
}
