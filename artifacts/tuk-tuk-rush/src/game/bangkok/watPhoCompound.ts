import { LandmarkBuilder } from "./landmarkBuilder";
import { thaiRoof, framedWindow } from "./templeCraft";
/** Compressed sacred precinct around the retained sculpted Reclining Buddha.
 * Official Wat Pho visitor map guides hall/chedi/cloister hierarchy; this is a
 * playable miniature, not a complete surveyed monastery reconstruction. */
export const WAT_PHO_MASSES = [
  { x: 28, z: 43, w: 27, d: 32, h: 27 },
  { x: -15, z: 43, w: 24, d: 24, h: 22 },
  { x: 58, z: 25, w: 5, d: 70, h: 7 },
  { x: -41, z: 28, w: 5, d: 64, h: 7 },
  { x: 9, z: 63, w: 93, d: 5, h: 7 },
];
export const WAT_PHO_WALLS = [
  { x: -50, z: 18, w: 0.8, d: 100, h: 3 },
  { x: 65, z: 18, w: 0.8, d: 100, h: 3 },
  { x: 7.5, z: -32, w: 115, d: 0.8, h: 3 },
  { x: -24, z: 68, w: 52, d: 0.8, h: 3 },
  { x: 40, z: 68, w: 50, d: 0.8, h: 3 },
];
export function buildWatPhoCourts(b: LandmarkBuilder, detail: boolean) {
  b.box(7.5, 0.12, 18, 115, 0.2, 100, "#c4b89d");
  for (const [i, m] of WAT_PHO_MASSES.entries()) {
    if (i < 2) {
      b.box(m.x, 1, m.z, m.w + 3, 2, m.d + 3, "#c8b791");
      b.box(m.x, 8, m.z, m.w, 12, m.d, "#e9ddbf");
      thaiRoof(b, m.x, 14, m.z, m.w + 4, m.d + 4, 5, "#bd5535", false);
      thaiRoof(b, m.x, 17, m.z, m.w * 0.8, m.d * 0.8, 4.7, "#40735b", false);
      thaiRoof(b, m.x, 20, m.z, m.w * 0.56, m.d * 0.63, 4.2, "#bd5535", false);
      for (const side of [-1, 1])
        for (let u = -m.w / 2 + 3; u < m.w / 2; u += 5) {
          b.box(
            m.x + u,
            8,
            m.z + side * (m.d / 2 + 0.4),
            0.4,
            12,
            0.5,
            "#dbc397",
          );
          framedWindow(
            b,
            m.x + u + 1.5,
            8,
            m.z + side * (m.d / 2 + 0.07),
            1.4,
            4,
            false,
          );
        }
    } else {
      b.box(m.x, 2.8, m.z, m.w, 5, m.d, "#e2d5b8");
      b.roof(m.x, 5.4, m.z, m.w + 1, m.d + 1, 1.6, "#a85c39");
      if (detail)
        for (let t = -m.d / 2 + 2; t < m.d / 2; t += 4)
          b.box(m.x - m.w / 2 - 0.03, 3, m.z + t, 0.12, 3.5, 2.4, "#75684b");
    }
  }
  for (const m of WAT_PHO_WALLS) {
    b.box(m.x, 1.5, m.z, m.w, 3, m.d, "#ebe1c5");
    b.box(m.x, 3.1, m.z, m.w + 0.2, 0.25, m.d + 0.2, "#b6a581");
  }
  // Ceramic-tiled gate, stone guardian pair, connected paving and salas.
  for (const x of [3, 13]) {
    b.box(x, 3.2, 68, 1.5, 6.4, 2, "#e4d7b8");
    b.roof(x, 6.4, 68, 4, 4, 2.8, "#597e68");
  }
  b.box(8, 0.29, 52, 8, 0.1, 31, "#d8c8a5");
  for (const x of [-31, 49])
    for (const z of [-19, 5]) {
      b.box(x, 2.8, z, 9, 0.4, 8, "#c9b78f");
      for (const side of [-1, 1])
        for (const end of [-1, 1])
          b.box(x + side * 3, 1.5, z + end * 2.5, 0.4, 3, 0.4, "#d4c09b");
      b.roof(x, 3.2, z, 10, 9, 2.7, "#aa5534");
    }
}
