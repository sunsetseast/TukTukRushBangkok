import * as T from "three";
import type { Landmark } from "../types";
import { LandmarkBuilder } from "./landmarkBuilder";

/** Site-specific original arcade assets; proportions compress the real places. */
export function sculptedLandmark(l: Landmark) {
  if (
    ![
      "gate",
      "arun",
      "pho",
      "icon",
      "paragon",
      "mahanakhon",
      "golden",
      "swing",
    ].includes(l.id ?? "")
  )
    return undefined;
  const b = new LandmarkBuilder(),
    S = l.size ?? 50;
  if (l.id === "gate") {
    b.box(0, 0.35, 0, 25, 0.7, 22, "#c4b692");
    for (const x of [-9, 9])
      for (const z of [-4.1, 4.1]) {
        b.shape(new T.CylinderGeometry(0.8, 1, 10.5, 10), x, 5.7, z, "#ad3544");
        b.box(x, 1.2, z, 2.3, 0.45, 2.3, "#eed6a6");
        b.box(x, 10.7, z, 2, 0.45, 2, "#d8ae52", 0, true);
      }
    b.box(0, 10.5, 0, 21, 1.2, 10, "#ad3544");
    b.roof(0, 11.1, 0, 26, 12, 3.1, "#3d7968");
    b.roof(0, 13.2, 0, 20, 10, 2.7, "#3d7968");
    for (const x of [-10, 10])
      b.box(x, 14.7, 0, 0.35, 2, 0.35, "#e5bd6d", 0, true);
    b.box(0, 10.65, 5.2, 7.5, 1.1, 0.3, "#143f42");
  } else if (l.id === "arun") {
    b.box(0, 0.7, 0, S - 1, 1.4, S - 1, "#d8d0b3");
    b.prang(0, 0, 56, 9.3, "#ece4cb");
    for (const x of [-16, 16])
      for (const z of [-16, 16]) b.prang(x, z, 23, 4.3, "#e0d8bd");
    for (const side of [-1, 1]) {
      b.box(side * 23, 2, 0, 1.2, 2.6, 43, "#e8dfc3");
      b.box(0, 2, side * 23, 43, 2.6, 1.2, "#e8dfc3");
      for (let i = 0; i < 5; i++)
        b.box(0, 1.5 + i * 0.42, side * (15 - i), 5, 0.35, 2.1, "#aaa38c");
    }
  } else if (l.id === "pho") {
    b.box(0, 0.55, 0, S - 0.5, 1.1, S - 0.5, "#d1c6a6");
    for (const x of [-13, 9]) {
      b.box(x, 3.2, -3, 13, 5.7, 25, "#eee2bf");
      for (const s of [-1, 1])
        for (let z = -12; z <= 6; z += 4.5)
          b.box(x + s * 5.6, 4, z, 0.55, 7, 0.55, "#edd7a2");
      b.roof(x, 6.7, -3, 15, 27, 3.8, "#a33936");
      b.roof(x, 9.2, -3, 11.5, 22, 3, "#b84b37");
      b.roof(x, 11, -3, 8, 18, 2.5, "#a33936");
    }
    ["#5c8d72", "#ede1c5", "#d1b34d", "#668eac"].forEach((col, i) =>
      b.prang(-18 + i * 11, 18, 19, 3.9, col),
    );
    for (const s of [-1, 1]) {
      b.box(s * 24, 2, 0, 1, 3, 48, "#ede4ca");
      b.box(0, 2, s * 24, 47, 3, 1, "#ede4ca");
    }
    b.box(0, 2.6, -24, 7.2, 5.2, 1.5, "#ddd1ad");
    b.box(0, 2.1, -25, 4.4, 4.2, 0.2, "#56604f");
    b.roof(0, 5.5, -24, 9, 3, 2, "#a33936");
  } else if (l.id === "icon") {
    b.box(0, 0.7, 0, S, 1.4, S, "#c3bca1");
    b.box(-6, 15, 0, 48, 29, 57, "#447a85");
    b.box(21, 20, -5, 17, 39, 45, "#477885");
    for (const side of [-1, 1])
      for (let u = -29; u < 30; u += 3.7) {
        const z = side * 29;
        b.box(
          u,
          16,
          z,
          3.5,
          28,
          0.6,
          u % 7 < 3 ? "#6cabad" : "#3e707e",
          0.12 * side,
        );
        b.box(u, 16, z + side * 0.45, 0.16, 29, 0.2, "#d6b463", 0, true);
      }
    for (let i = 0; i < 5; i++) {
      const x = -24 + i * 11.4;
      b.roof(x, 29.5, 0, 14, 57, 5 + (i % 3), "#bd9e54");
      b.box(x, 8, -29.8, 10, 0.4, 0.6, "#d1bd77", 0, true);
    }
    b.box(0, 4.5, -30, 17, 7.6, 0.6, "#c4b97d");
    b.box(0, 4.4, -30.5, 14, 6, 0.15, "#547d80");
    b.box(0, 8.6, -31, 21, 0.45, 2.5, "#dfc981", 0, true);
    b.box(0, 1.7, 30, 55, 3.4, 5, "#c6bd9e");
    b.box(0, 3.5, 30, 55, 0.3, 5, "#e0ccb0");
    // The river and street see different elevations: pleats continue around
    // both end walls rather than leaving a blank teal box on the approach.
    for (const x of [-30.2, 30.2])
      for (let z = -26; z <= 26; z += 3.7) {
        b.box(x, 15.5, z, 0.3, 26, 3.45, "#679eaa");
        b.box(
          x + Math.sign(x) * 0.2,
          15.5,
          z,
          0.18,
          27,
          0.14,
          "#d6b463",
          0,
          true,
        );
      }
  } else if (l.id === "paragon") {
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
  } else if (l.id === "mahanakhon") {
    for (let i = 0; i < 18; i++) {
      const cut = i > 5 && i < 16,
        side = i % 4,
        w = S * 0.8;
      b.box(
        cut ? [-4, 4, 0, 0][side]! : 0,
        3 + i * 5.4,
        0,
        cut ? w - 7 : w,
        5.3,
        w,
        "#6a8c9a",
      );
      if (cut)
        b.box(
          [-9, 9, 0, 0][side]!,
          3 + i * 5.4,
          [-9, 9, -9, 9][side]!,
          6,
          4.7,
          6,
          "#45727f",
        );
      b.box(0, 5.6 + i * 5.4, 0, w, 0.12, w, "#acbdc0");
    }
  } else if (l.id === "golden") {
    b.shape(new T.ConeGeometry(S * 0.47, 27, 14), 0, 13.5, 0, "#708059");
    b.box(0, 28, 0, 15, 3, 15, "#d7c09b");
    const top = new T.LatheGeometry(
      [
        new T.Vector2(0, 0),
        new T.Vector2(5, 0),
        new T.Vector2(5, 2),
        new T.Vector2(3, 4),
        new T.Vector2(2, 9),
        new T.Vector2(0, 17),
      ],
      10,
    );
    b.shape(top, 0, 29.5, 0, "#dfbf5e", 0, true);
  } else {
    for (const x of [-5, 5]) b.box(x, 9, 0, 0.7, 18, 0.8, "#a7373c");
    b.box(0, 18, 0, 13, 0.8, 1.1, "#b14442");
    b.box(0, 19, 0, 8, 0.8, 0.8, "#b14442");
  }
  return b.finish(l.id!);
}
