import {heritageLandmark} from './heritageLandmarks';
import { buddhaLandmark } from './buddhaLandmarks';
import { skylineLandmark, civicLandmark } from './skylineLandmarks';
import * as T from "three";
import type { Landmark } from "../types";
import { LandmarkBuilder } from "./landmarkBuilder";

/** Site-specific original arcade assets; proportions compress the real places. */
export function sculptedLandmark(l: Landmark) {
  const special=buddhaLandmark(l)??heritageLandmark(l)??skylineLandmark(l)??civicLandmark(l);if(special)return special;
  if (!['icon','paragon'].includes(l.id??'')) return;
  const b=new LandmarkBuilder(), S=l.size??65;
  if(l.id==='icon') {
    b.box(0, 0.7, 0, S, 1.4, S, "#c3bca1");
    b.sculpt(new T.BoxGeometry(48,29,57),-6,15,0,"#447a85","glass");
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
    b.sculpt(new T.BoxGeometry(14,6,.15),0,4.4,-30.5,"#547d80","glass");
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
  }
  for(const side of [-1,1])for(let x=-25;x<=25;x+=5){b.box(x,2,side*30.8,3.8,.4,.8,'#a7b9ab');b.box(x,3.7,side*30.9,.1,3,.12,'#e0dcc5');}
  return b.finish(`refined-${l.id}-commercial-v3`);
}
