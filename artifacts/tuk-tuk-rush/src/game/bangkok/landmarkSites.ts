import {curtain,glazing,foldedRoof,planter,palm,entrance} from './heroCraft';
import { buildHuaLamphong } from './huaLamphong';
import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
import { thaiRoof, framedWindow } from './templeCraft';
import { ribbonPath } from './sculptureGeometry';
const IVORY = '#f3e4bf',
  GOLD = '#e7b544',
  RED = '#c54e3b',
  GREEN = '#277963';
/** Original compressed interpretations. Site relationships follow official visitor
 * maps/photos; the game plot, access road and closed boundaries remain authoritative. */
export const REVIEWED_SITES = [
  'palace',
  'gate',
  'golden',
  'traimit',
  'icon',
  'khaosan',
  'swing',
  'democracy',
  'hua',
];
function tree(b: LandmarkBuilder, x: number, z: number, h = 7, y = 0) {
  b.sculpt(new T.CylinderGeometry(0.2, 0.4, h * 0.55, 6), x, y + h * 0.27, z, '#926741');
  for(let i=0;i<4;i++) {
    const a=i*2.4+x*.1+z*.13,dx=Math.sin(a)*h*.17,dz=Math.cos(a)*h*.17;
    b.sculpt(new T.CylinderGeometry(.08,.15,h*.42,5).rotateZ(.6).rotateY(a),x+dx*.5,y+h*.52,z+dz*.5,'#806b48');
    b.sculpt(new T.SphereGeometry(h*.27,8,5).scale(1.25,.68,1),x+dx,y+h*(.69+(i%2)*.1),z+dz,i%2?'#638d50':'#477748');
  }
}
/** Square, receding prasat crown rather than a bell-shaped stupa. */
function prasat(b:LandmarkBuilder,x:number,y:number,z:number,scale=1) {
  for(let i=0;i<6;i++) {
    const r=(2.9-i*.38)*scale;
    b.sculpt(new T.CylinderGeometry(r*.67,r,1.4*scale,4),x,y+i*1.45*scale,z,GOLD,'gilded',Math.PI/4);
  }
  b.sculpt(new T.ConeGeometry(.65*scale,7.5*scale,8),x,y+12*scale,z,GOLD,'gilded');
}
function bell(b: LandmarkBuilder, x: number, y: number, z: number, r: number, h: number) {
  const p = [
    [1, 0],
    [1, 0.05],
    [0.84, 0.09],
    [0.9, 0.15],
    [0.65, 0.2],
    [0.71, 0.32],
    [0.64, 0.42],
    [0.44, 0.52],
    [0.3, 0.58],
    [0.3, 0.63],
    [0.22, 0.66],
    [0.19, 0.76],
    [0.12, 0.86],
    [0, 1],
  ];
  b.sculpt(
    new T.LatheGeometry(
      p.map(([a, q]) => new T.Vector2(a! * r, q! * h)),
      24,
    ),
    x,
    y,
    z,
    GOLD,
    'gilded',
  );
  for (let i = 0; i < 5; i++)
    b.sculpt(
      new T.CylinderGeometry(r * (0.28 - i * 0.045), r * (0.31 - i * 0.045), 0.35, 16),
      x,
      y + h * (0.65 + i * 0.048),
      z,
      '#f3ce70',
      'gilded',
    );
}
function hall(
  b: LandmarkBuilder,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: string,
  detail: boolean,
  y = 0,
) {
  b.box(x, y + 0.8, z, w + 3, 1.6, d + 3, '#d5bd8b');
  b.box(x, y + h / 2 + 1, z, w, h, d, IVORY);
  for (const side of [-1, 1]) {
    for (let u = -w / 2 + 2; u <= w / 2 - 1; u += 3.5)
      framedWindow(b, x + u, y + h * 0.58 + 1, z + side * (d / 2 + 0.12), 1.4, h * 0.45, detail);
    for (let q = -d / 2 + 1; q < d / 2; q += 4)
      b.sculpt(
        new T.CylinderGeometry(0.25, 0.34, h + 1, 6),
        x + side * (w / 2 + 1),
        y + h / 2 + 1,
        z + q,
        '#f1d393',
      );
  }
  thaiRoof(b, x, y + h + 1, z, w + 5, d + 6, h * 0.45, color, false);
  thaiRoof(b, x, y + h + 3, z, w + 1, d + 2, h * 0.42, color, detail);
  b.box(x, y + 2, z + d / 2 + 0.35, 3, 3.4, 0.3, '#664736');
}
function gallery(
  b: LandmarkBuilder,
  x: number,
  z: number,
  length: number,
  side: boolean,
  detail: boolean,
) {
  b.box(x, 2.3, z, side ? 4 : length, 3.2, side ? length : 4, IVORY);
  b.roof(x, 4, z, side ? 5 : length + 1, side ? length + 1 : 5, 1.7, RED);
  if (detail)
    for (let q = -length / 2 + 2; q < length / 2; q += 4) {
      b.box(
        x + (side ? -2.05 : q),
        2.6,
        z + (side ? q : 2.05),
        side ? 0.12 : 2.7,
        2.6,
        side ? 2.7 : 0.12,
        '#734b3e',
      );
      b.box(
        x + (side ? -2.2 : q),
        2.6,
        z + (side ? q : 2.2),
        side ? 0.3 : 0.25,
        3.4,
        side ? 0.25 : 0.3,
        '#eac98c',
      );
    }
}
function palace(b: LandmarkBuilder, detail: boolean) {
  b.box(0, 0.28, 0, 133, 0.56, 133, '#e4cda3');
  // Northern royal chapel precinct; palace halls to its south. Deliberately dense courts, not scattered icons.
  b.box(9, 0.63, -29, 99, 0.2, 63, '#e5d5ad');
  // Roofed inner cloisters sit behind the WHITE outer fortified perimeter.
  // The old model made the entire palace boundary a red-roofed gallery.
  for (const x of [-58, 58]) gallery(b, x, 0, 115, true, detail);
  for (const z of [-58, 58]) gallery(b, 0, z, 115, false, detail);
  for(const side of [-1,1]) {
    b.box(side*66,2.35,0,.9,4.7,132,'#f3edda');
    for(const x of [-36,36])b.box(x,2.35,side*66,60,4.7,.9,'#f3edda');
    b.box(side*66,4.7,0,1.15,.35,132,'#ddd7c7');
    for(let q=-63;q<=63;q+=detail?3:6) {
      b.box(side*66,5.2,q,1.05,1,1.4,'#f4eedc');
      if(Math.abs(q)>6)b.box(q,5.2,side*66,1.4,1,1.05,'#f4eedc');
    }
    for(const z of [-65,65]) {
      b.box(side*65,3,z,3.8,6,3.8,IVORY);
      thaiRoof(b,side*65,6,z,5.3,5.3,2.3,'#d9d5bf',false);
    }
  }
  gallery(b, 9, 6, 99, false, detail);
  gallery(b, -40, -27, 63, true, detail);
  // North public gate is on the outer boundary, rather than hidden behind
  // the closed gallery. The door remains closed to vehicles; visitor driving
  // uses the separate perimeter drop-off. Original compressed gate geometry.
  for (const x of [-4, 4]) {
    b.box(x, 3.6, -66.7, 1.2, 7.2, 2, IVORY);
    b.box(x, 7.4, -66.7, 1.8, .5, 2.5, '#e5d5b9');
  }
  b.box(0, 2.9, -67.05, 6.8, 5.8, .25, '#654f43');
  b.box(0, 6.3, -66.7, 9.5, 1, 2.6, IVORY);
  thaiRoof(b, 0, 7, -66.7, 11, 4, 2.1, '#e6d9bf', detail);
  bell(b, 0, 8.2, -66.7, 1.1, 4.8);
  // Upper terrace: bell chedi, square Phra Mondop and eastern Royal Pantheon.
  b.box(-3, 1.2, -45, 75, 1.7, 25, '#c9b386');
  bell(b, -27, 2, -45, 9, 37);
  b.box(-4, 6, -45, 13, 8, 13, '#dab45e');
  for (let i = 0; i < 4; i++)
    thaiRoof(b, -4, 10 + i * 2, -45, 17 - i * 3, 17 - i * 3, 3.6, GREEN, false);
  bell(b, -4, 20, -45, 2.7, 13);
  hall(b, 22, -43, 19, 23, 11, '#df713e', detail);
  bell(b, 22, 22, -43, 2.5, 18);
  // Emerald Buddha chapel with three descending roof tiers, colonnade and gilded surrounds.
  hall(b, 10, -15, 24, 31, 10, '#ce553b', detail);
  thaiRoof(b, 10, 16, -15, 21, 28, 4, GREEN, false);
  for (const x of [-6, 26])
    for (const z of [-32, 2]) {
      b.box(x, 2, z, 2.5, 2.5, 2.5, '#d2ab5b');
      bell(b, x, 3, z, 0.8, 3);
    }
  for (const z of [-53, -46, -39, -32, -25, -18, -11, -4]) {
    b.box(54, 1, z, 5, 1, 5, '#ddc799');
    bell(b, 54, 1.3, z, 1.9, 13);
  }
  hall(b, -24, -14, 12, 19, 6, GREEN, false);
  // Chakri: classical lower wings supporting three distinctive Thai crowns.
  b.box(9, 7, 30, 76, 13, 22, '#f1dfb8');
  b.box(9, 14, 30, 70, 1, 24, '#d0b17b');
  for (const x of [-16, 9, 34]) {
    b.box(x, 16.5, 30, 15, 7, 23, IVORY);
    thaiRoof(b, x, 20.5, 30, 18, 26, 6, GREEN, false);
    prasat(b, x, 25, 30);
  }
  for (let x = -25; x < 47; x += 4)
    for (const y of [4.5, 10]) framedWindow(b, x, y, 41.2, 1.8, 3.5, false, '#bd9c60');
  hall(b, -45, 30, 18, 24, 9, RED, detail);
  bell(b, -45, 19, 30, 2.7, 17);
  // Formal planted courts and gates are inside the existing closed compound.
  for (const x of [-30, 49])
    for (const z of [15, 48]) {
      b.box(x, 0.8, z, 8, 0.4, 8, '#7fac66');
      tree(b, x, z, 5, 0.9);
    }
  for (const z of [-61, 61]) {
    b.box(0, 4, z, 8, 6, 3, IVORY);
    thaiRoof(b, 0, 7, z, 11, 5, 3, GREEN, false);
    b.box(0, 2.8, z + 0.2, 3, 4, 0.4, '#78523b');
  }
}
function chineseRoof(b: LandmarkBuilder, y: number, w: number, d: number, x = 0) {
  const rows = 7,
    cols = 12,
    verts: number[] = [],
    indices: number[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * 2 - 1,
        v = (j / rows) * 2 - 1,
        edge = Math.pow(Math.abs(u), 4),
        end = Math.pow(Math.abs(v), 6);
      verts.push((u * w) / 2, y + 2.5 * (1 - Math.abs(u)) + 0.9 * edge + 0.75 * end, (v * d) / 2);
      if (i < cols && j < rows) {
        const k = j * (cols + 1) + i;
        indices.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  b.sculpt(g, x, 0, 0, '#327e6a');
  for (const side of [-1, 1]) {
    const pts = Array.from({ length: 13 }, (_, i) => {
      const u = i / 6 - 1;
      return [
        (u * w) / 2,
        y + 2.5 * (1 - Math.abs(u)) + 0.9 * Math.pow(Math.abs(u), 4) + 0.75,
        (side * d) / 2,
      ] as [number, number, number];
    });
    b.sculpt(ribbonPath(pts, 0.13, 5, 12), x, 0, 0, '#edbb4a', 'gilded');
  }
  for (const side of [-1, 1])
    b.sculpt(
      ribbonPath(
        [
          [(side * w) / 2, y + 0.8, -d / 2],
          [(side * w) / 2, y + 0.9, 0],
          [(side * w) / 2, y + 1.6, d / 2],
        ],
        0.15,
        5,
        12,
      ),
      x,
      0,
      0,
      GOLD,
      'gilded',
    );
}
function gate(b: LandmarkBuilder, detail: boolean) {
  b.sculpt(new T.CylinderGeometry(15, 15, 0.6, 40), 0, 0.35, 0, '#dbc596');
  for (const x of [-9, 9])
    for (const z of [-3.4, 3.4]) {
      b.sculpt(new T.CylinderGeometry(1.15, 1.3, 0.9, 12), x, 0.8, z, '#c3ad80');
      b.sculpt(new T.CylinderGeometry(0.76, 0.9, 13.2, 12), x, 7.8, z, '#d33a37');
      for (const y of [1.5, 13.7])
        b.sculpt(new T.CylinderGeometry(0.9, 0.9, 0.35, 12), x, y, z, GOLD, 'gilded');
      if (detail)
        for (let k = 0; k < 3; k++)
          b.sculpt(
            ribbonPath(
              [
                [x - 0.5, 3 + k * 2, z + 0.55],
                [x + 0.5, 4 + k * 2, z + 0.55],
                [x - 0.5, 5 + k * 2, z + 0.55],
              ],
              0.07,
              4,
              8,
            ),
            0,
            0,
            0,
            GOLD,
            'gilded',
          );
    }
  b.box(0, 11.6, 0, 21.5, 1.3, 8, '#be3534');
  b.box(0, 14.5, 0, 22, 1.5, 8, '#295f75');
  chineseRoof(b, 15.3, 26, 11);
  for (const side of [-1, 1]) {
    b.box(side * 10, 9.3, 0, 8, 1.4, 8, '#285c74');
    chineseRoof(b, 10.1, 10, 10, side * 10);
  }
  for (const side of [-1, 1]) {
    b.box(0, 12.8, side * 4.15, 14, 2.3, 0.3, '#23546c');
    for (const y of [11.5, 14.1]) b.box(0, y, side * 4.35, 14.5, 0.18, 0.2, GOLD, 0, true);
    // Lettered boards use the shared locally licensed sign atlas in signage.ts.
    for (const x of [-6.7, 6.7]) b.box(x, 9.2, side * 3.9, 3, 0.7, 0.4, GOLD);
  }
  b.sculpt(
    ribbonPath(
      [
        [-8, 18.1, 0],
        [-5, 18.3, 0],
        [-3, 19.8, 0],
        [0, 19.2, 0],
        [3, 19.8, 0],
        [5, 18.3, 0],
        [8, 18.1, 0],
      ],
      0.22,
      6,
      16,
    ),
    0,
    0,
    0,
    GOLD,
    'gilded',
  );
  b.sculpt(new T.IcosahedronGeometry(0.7, 1), 0, 20, 0, '#f1c951', 'gilded');
  for (const x of [-12, 12])
    for (const z of [-7, 7]) {
      b.box(x, 0.9, z, 2, 0.5, 2, '#bca578');
      b.sculpt(new T.SphereGeometry(0.7, 8, 6), x, 1.7, z, '#8b9c62');
    }
}
function golden(b: LandmarkBuilder, detail: boolean) {
  // Radial terrain with nonuniform contour and joined faces: no visible stacked cylinder tiers.
  const n = 48,
    rings = 12,
    p: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings,
      base = 38 * Math.pow(1 - t, 0.58) + 3;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        r = base * (1 + 0.075 * Math.sin(a * 3 + t * 3) + 0.035 * Math.cos(a * 7));
      p.push(Math.sin(a) * r, 1 + 33 * t, Math.cos(a) * r * 0.92);
      if (j < rings && i < n) {
        const k = j * (n + 1) + i;
        idx.push(k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.sculpt(g, 0, 0, 0, '#719b5e');
  for (let i = 0; i < (detail ? 102 : 42); i++) {
    const a = i * 2.4,
      t = (i % 13) / 15 + 0.025,
      r = (38 * Math.pow(1 - t, 0.58) + 3) * (1 + .075*Math.sin(a*3+t*3)+.035*Math.cos(a*7));
    // Match the actual terrain radius at this height. The old r-2 roots were
    // embedded uphill, burying crowns and leaving a bare geometric cone.
    tree(b, Math.sin(a) * r, Math.cos(a) * r * .92, 7 + (i % 4)*1.2, 1 + 33 * t);
  }
  const steps = detail ? 172 : 80;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1),
      a = -2 + t * Math.PI * 3.7,
      r = 38 * Math.pow(1 - t, 0.58) + 3.8,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r * 0.92,
      y = 1 + 33 * t;
    b.box(x, y, z, 3.1, 0.35, 3.4, '#d0a078', a);
    if (i % 3 === 0) {
      b.box(x + Math.sin(a) * 1.1, y + 0.7, z + Math.cos(a) * 1.1, 0.12, 1.4, 0.12, IVORY);
    }
  }
  for (let i = 0; i < 3; i++) b.box(0, 34 + i * 0.6, 0, 18 - i * 0.8, 0.7, 18 - i * 0.8, IVORY);
  b.box(0, 37.1, 0, 14, 4.5, 14, '#f5edcf');
  for (const side of [-1, 1])
    for (let q = -8; q <= 8; q += 2) {
      b.box(q, 37, side * 8.6, 0.3, 2.2, 0.3, IVORY);
      b.box(side * 8.6, 37, q, 0.3, 2.2, 0.3, IVORY);
    }
  for (const side of [-1, 1]) {
    b.box(0, 38, side * 8.6, 18, 0.35, 0.45, IVORY);
    b.box(side * 8.6, 38, 0, 0.45, 0.35, 18, IVORY);
  }
  bell(b, 0, 39, 0, 6.5, 23);
  // White retaining terraces and red stair balustrades distinguish the built
  // temple hill from a free-standing gold tower. Lower Wat Saket lies south.
  for(let j=0;j<3;j++) {
    const y=3+j*8, r=37-j*7;
    // Retaining walls follow the SAME irregular terrain contour at this height;
    // circular torus bands previously floated away from the sloping hillside.
    const t=(y-1)/33,base=38*Math.pow(1-t,.58)+3,pts=Array.from({length:49},(_,i)=>{
      const a=i/48*Math.PI*1.8,rr=base*(1+.075*Math.sin(a*3+t*3)+.035*Math.cos(a*7));
      return [Math.sin(a)*rr,y,Math.cos(a)*rr*.92] as [number,number,number];
    });
    b.sculpt(ribbonPath(pts,.48,4,detail?96:48),0,0,0,'#e4d7bd');
  }
  // Landings, white stair parapets and bell pavilion punctuate the planted hill.
  for(const [x,z,y,a] of [[-29,12,10,-1.2],[17,-23,19,2.5],[15,11,29,.8]]) {
    b.box(x!,y!,z!,6,.35,5,'#c9ae8d',a!);
    b.box(x!,y!+1,z!+2.3,6,1.3,.4,IVORY,a!);
  }
  b.box(-32,1,45,10,1,8,IVORY);
  for(const x of [-36,-28])for(const z of [42,48])b.box(x,3.3,z,.35,4,.35,IVORY);
  thaiRoof(b,-32,5.3,45,12,10,3,RED,detail);
  for(const x of [-34,-30])b.sculpt(new T.LatheGeometry([new T.Vector2(1,0),new T.Vector2(.8,1.2),new T.Vector2(.2,1.5)],10),x,2.7,45,'#8c7751','bronze');
  hall(b, -18, 49, 25, 23, 8, RED, detail);
  hall(b, 25, 44, 16, 20, 6, GREEN, false);
  b.box(0,.12,48,98,.18,36,'#c4b99b');
  for(const x of [-48,48]) {
    b.box(x,1.4,10,.7,2.8,118,'#e8dec5');
    for(const z of [-40,-16,13,45])tree(b,x*.87,z,8);
  }
  b.box(0,1.4,-49,96,2.8,.7,'#e8dec5');
  for(const x of [-30,30])b.box(x,1.4,66,36,2.8,.7,'#e8dec5');
  for(const x of [-10,10]){b.box(x,2.4,66,1.7,4.8,1.7,IVORY);thaiRoof(b,x,4.8,66,4,4,2,RED,false);}

}
function traimit(b: LandmarkBuilder, detail: boolean) {
  b.box(0, 0.35, 0, 52, 0.7, 52, '#dcc9a3');
  for (let f = 0; f < 3; f++) {
    const w = 46 - f * 6,
      y = 2.6 + f * 4;
    b.box(0, y, 0, w, 3.6, w, '#f2ead6');
    b.box(0, y + 2, 0, w + 1, 0.55, w + 1, '#d5c59d');
    for (const side of [-1, 1])
      for (let x = -w / 2 + 3; x < w / 2 - 1; x += 4.5)
        framedWindow(b, x, y, side * (w / 2 + 0.12), 2, 2.6, detail, '#dec891');
  }
  // Two lateral flights and a central upper flight leave the facade visible.
  for (const side of [-1, 1])
    for (let i = 0; i < 20; i++) {
      const x = side * (21 - i * 0.6),
        z = 18 - i * 0.27,
        y = 0.9 + i * 0.43;
      b.box(x, y, z, 4, 0.5, 1.4, '#efe4cb');
      if (i % 3 === 0) b.box(x + side * 2, y + 0.7, z, 0.2, 1.4, 0.25, '#dac9a6');
    }
  hall(b, 0, 0, 23, 23, 8, GOLD, detail, 12);
  thaiRoof(b, 0, 25.5, 0, 22, 22, 4, GOLD, false);
  // The mondop has a cruciform roof and a slender prasat spire, not a bell chedi.
  b.box(0, 25, 0, 10, 6, 10, '#edddad');
  for (const side of [-1, 1]) {
    thaiRoof(b, side * 5, 24.8, 0, 9, 12, 4, GOLD, false);
    b.box(side * 5, 24.5, 6.1, 3.5, 3, 0.25, '#528986');
  }
  thaiRoof(b, 0, 28, 0, 13, 14, 4, GOLD, false);
  const needle = [
    [3, 0],
    [3, 0.6],
    [2.2, 1.2],
    [2.8, 2],
    [1.8, 3],
    [2.2, 4],
    [1.5, 5],
    [1.7, 6],
    [1.1, 7],
    [1.3, 8],
    [0.9, 9],
    [0.65, 12],
    [0.35, 15],
    [0, 19],
  ];
  b.sculpt(
    new T.LatheGeometry(
      needle.map(([r, y]) => new T.Vector2(r!, y!)),
      16,
    ),
    0,
    30,
    0,
    GOLD,
    'gilded',
  );
  for (const x of [-13, 13])
    for (const z of [-13, 13]) {
      b.box(x, 14, z, 5, 2, 5, IVORY);
      thaiRoof(b, x, 15, z, 6, 6, 3, GOLD, false);
    }
  // Marble balustrades, recessed upper doors and gilded columns articulate the
  // ceremonial terraces instead of three undifferentiated stacked boxes.
  for(const side of [-1,1]) {
    for(let u=-20;u<=20;u+=detail?2:4) {
      b.box(u,5.2,side*23.2,.24,1.5,.24,IVORY);
      b.box(side*23.2,5.2,u,.24,1.5,.24,IVORY);
    }
    b.box(0,6,side*23.2,46,.25,.35,'#d0b77d');
    b.box(side*23.2,6,0,.35,.25,46,'#d0b77d');
    for(const x of [-9,-3,3,9]) {
      b.box(x,17,side*12.2,3,6,.22,'#52645d');
      b.box(x-1.7,17,side*12.5,.36,6.5,.5,'#e7c674');
    }
  }
  for(let i=0;i<12;i++)b.box(0,9+i*.25,12-i*.42,7,.3,.8,'#f3ead7');

  for (const x of [-15, 15])
    for (const z of [-15, 15]) {
      b.box(x, 13, z, 3, 1, 3, IVORY);
      bell(b, x, 13.5, z, 1.4, 10);
    }
  for (const x of [-29,29]) {
    b.box(x,1.35,0,.65,2.7,62,'#f2e8d1');
    for(const z of [-24,22])tree(b,x*.88,z,5);
  }
  b.box(0,1.35,-31,58,2.7,.65,'#f2e8d1');
  for(const x of [-19,19])b.box(x,1.35,31,20,2.7,.65,'#f2e8d1');
  for(const x of [-8,8]){
    b.box(x,3,31,1.5,6,1.7,'#f7edd8');
    thaiRoof(b,x,6,31,4,4,1.6,GOLD,false);
  }
  b.box(0,.12,30,15,.18,12,'#d8c9aa');
}
function icon(b:LandmarkBuilder,detail:boolean){
 b.box(0,.4,0,65,.8,65,'#cfc4ad');
 // Layered retail depth; the existing internal rotation faces +Z to river east.
 for(let i=0;i<3;i++){const w=60-i*8,d=47-i*7,y=5+i*8;b.box(-i, y,-i*3,w,9,d,'#c2bca8');b.box(-i,y+4.7,-i*3,w+1,.55,d+1,'#d6b263');}
 for(let i=0;i<12;i++){
  const x=-27.5+i*5,yaw=i%2?.6:-.6;
  glazing(b,x,12,26.1,5.5,20,.22,i%2?'#537f8c':'#3c6677',yaw);
  b.box(x,12,27,.14,20.3,.22,'#cdb57b');
 }
 for(const y of [4.5,11,19.5,22])b.box(0,y,26.7,59,.23,.5,'#c5c3a8');
 for(const side of [-1,1])curtain(b,side*30.45,12,0,43,21,detail,side*Math.PI/2,10,4);
 // Separate road elevation, rather than a second copy of the river facade.
 curtain(b,0,12,-24.1,54,21,detail,Math.PI,12,4);
 entrance(b,20,-26.1,detail);
 for(const x of [-25,25]){planter(b,x,-28,6,3,detail);palm(b,x,-28,5.2,detail);}
 // Thai-inspired peaked gold profile, set-back upper glazed gable and roofs.
 foldedRoof(b,0,25,10,37,12,3.5,detail);
 for(const x of [-23,23])foldedRoof(b,x,24,4,16,5.5,8,detail);
 curtain(b,0,25.8,10.3,30,6,detail,0,10,1);
 b.box(0,22.5,16,53,.6,7,'#b5aa8d');
 for(const x of [-24,24]){b.box(x,7,28,1,12,1,'#c7ac68');b.box(x,13,27,5,.5,3,'#c8a15d');}
 curtain(b,0,3.7,27.2,18,5.8,detail,0,6,1);
 b.box(0,7,29,23,.4,4,'#c1b28b');b.box(0,6.76,29,20,.08,3,'#d3b17a',0,true);
 for(const x of [-24,24]){planter(b,x,29,7,3,detail);palm(b,x,28,5,detail);}
 for(const x of [-17,-6,6,17])planter(b,x,-17,5,4,detail,26.1);
}
function khaosan(b: LandmarkBuilder, detail: boolean) {
  b.box(0, 0.2, 0, 31, 0.4, 34, '#cfb998');
  b.box(0, 0.45, 0, 9, 0.1, 34, '#9b8c83');
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const z = -14 + i * 6.5,
        x = side * 11,
        h = 7 + (i % 3) * 2.5;
      b.box(
        x,
        h / 2 + 0.5,
        z,
        8,
        h,
        6.2,
        ['#e4ac79', '#77b6ab', '#e4c678', '#bd93ad', '#d8ab91'][i]!,
      );
      b.box(x, h + 0.7, z, 8.5, 0.5, 6.6, i % 2 ? '#a3595f' : '#667d76');
      for (let y = 5; y < h; y += 3)
        for (const q of [-1.6, 1.6]) {
          b.box(x - side * 4.05, y, z + q, 0.15, 1.8, 1.2, '#467478');
          b.box(x - side * 4.5, y - 0.9, z + q, 1, 0.2, 1.8, IVORY);
        }
      b.box(x - side * 4.1, 2, z, 0.15, 3, 4.5, '#584d44');
      b.box(x - side * 4.9, 3.5, z, 1.9, 0.3, 5.5, i % 2 ? '#d1845b' : '#5a9d91');
      b.box(
        x - side * 4.4,
        4.4,
        z,
        0.4,
        1.1,
        4.7,
        ['#8165a4', '#d65e46', '#287e91', '#c38932', '#517f52'][i]!,
        0,
        true,
      );
      if (detail) {
        for (const q of [-1.5, 1.5]) {
          b.box(x - side * 5.2, 1, z + q, 1.1, 1.2, 1, '#d6ab66');
          b.sculpt(
            new T.CylinderGeometry(0.5, 0.5, 0.15, 8),
            x - side * 5.5,
            1.5,
            z + q,
            '#e8c88a',
          );
        }
      }
    }
  for (let z = -12; z < 15; z += 7) {
    b.box(0, 6, z, 15, 0.06, 0.06, '#514d47');
    for (let x = -5; x <= 5; x += 2)
      b.sculpt(new T.SphereGeometry(0.13, 6, 4), x, 5.8, z, '#f0c26d', 'gilded');
  }
  // Corridor end elevations are guesthouses too, not blank party walls.
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      const x = side * 11,
        z = end < 0 ? -17.15 : 15.25;
      for (const u of [-2, 2]) {
        b.box(x + u, 6, z, 1.5, 2, 0.15, '#447976');
        b.box(x + u, 4.9, z + 0.2, 2, 0.2, 0.8, IVORY);
      }
      b.box(x, 3.6, z, 7, 0.7, 0.35, '#268d91');
      b.box(x, 1.8, z, 2.2, 2.8, 0.2, '#665140');
    }
  if (detail)
    for (let z = -11; z <= 10; z += 7)
      for (let x = -4; x <= 4; x += 2) {
        const flag = new T.BufferGeometry();
        flag.setAttribute(
          'position',
          new T.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, -0.95, 0], 3),
        );
        flag.setIndex([0, 1, 2, 2, 1, 0]);
        flag.computeVertexNormals();
        b.sculpt(
          flag,
          x,
          5.8,
          z,
          ['#e77d52', '#53b9ba', '#e0b65b', '#a386b8'][Math.abs(x / 2 + z) % 4]!,
        );
      }
}
function swing(b: LandmarkBuilder, detail: boolean) {
  b.box(0, 0.25, 0, 31, 0.5, 31, '#d7bd94');
  for (const x of [-5.4, 5.4]) {
    b.box(x, 0.9, 4, 2.2, 1.3, 3, '#e9d7ae');
    for (const z of [3.65, 4.35])
      b.sculpt(new T.CylinderGeometry(0.25, 0.44, 20, 8), x, 11, z, '#c83e32');
    b.box(x, 20.8, 4, 1, 2, 1.7, RED);
  }
  const shape = new T.Shape([
    new T.Vector2(-8, 1.3),
    new T.Vector2(-7.4, 0),
    new T.Vector2(0, -0.25),
    new T.Vector2(7.4, 0),
    new T.Vector2(8, 1.3),
    new T.Vector2(5.2, 0.65),
    new T.Vector2(0, 0.5),
    new T.Vector2(-5.2, 0.65),
  ]);
  b.sculpt(new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }), 0, 22, 3.5, '#ce4231');
  b.box(0, 20.8, 4, 13.5, 0.5, 1.2, '#a6342d');
  // Compressed Wat Suthat hall behind the frame, kept inside this closed plot.
  hall(b, 0, -9, 19, 11, 7, '#cc5839', detail);
  for (const x of [-12, 12]) {
    tree(b, x, -10, 6);
    b.box(x, 1, 8, 3, 0.8, 1.2, '#b69976');
  }
}
function democracy(b: LandmarkBuilder, detail: boolean) {
  b.sculpt(new T.CylinderGeometry(26,26,.25,detail?64:32),0,.13,0,'#c4b89b');
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    b.box(Math.sin(a)*23,.35,Math.cos(a)*23,2.4,.4,2.4,'#5e8463',a);
  }
  b.sculpt(new T.CylinderGeometry(16, 16, 0.6, 48), 0, 0.4, 0, '#d7c3a1');
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2,
      x = Math.sin(a) * 10,
      z = Math.cos(a) * 10;
    const s = new T.Shape([
      new T.Vector2(-3, 0),
      new T.Vector2(2.8, 0),
      new T.Vector2(2.1, 5),
      new T.Vector2(0.4, 23),
      new T.Vector2(-0.6, 24),
      new T.Vector2(-1.4, 14),
    ]);
    b.sculpt(
      new T.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: false }).translate(0, 0, -0.75),
      x,
      1.2,
      z,
      '#f1e2c3',
      'ceramic',
      a,
    );
    b.box(x, 2, z, 5.4, 3, 4, '#b6a181', a);
    if (detail)
      for (let j = 0; j < 6; j++) {
        const u = (j - 2.5) * 0.65;
        b.sculpt(
          new T.CylinderGeometry(0.16, 0.22, 0.9, 5),
          x + Math.cos(a) * u,
          2.2,
          z - Math.sin(a) * u + 1.8,
          '#dbbd8d',
        );
        b.sculpt(
          new T.SphereGeometry(0.19, 6, 4),
          x + Math.cos(a) * u,
          2.9,
          z - Math.sin(a) * u + 1.8,
          '#dbbd8d',
        );
      }
  }
  b.sculpt(new T.CylinderGeometry(3.6, 4.4, 3.4, 12), 0, 2.8, 0, IVORY);
  b.sculpt(new T.CylinderGeometry(4.1, 4.1, 0.4, 12), 0, 4.6, 0, '#d6ba7e');
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    b.box(Math.sin(a) * 3.5, 2.7, Math.cos(a) * 3.5, 1.1, 1.7, 0.15, '#725f46', a);
  }
  b.sculpt(new T.CylinderGeometry(1.6, 0.6, 0.9, 16), 0, 5.3, 0, GOLD, 'gilded');
  b.sculpt(new T.CylinderGeometry(2, 1.1, 0.7, 16), 0, 6.1, 0, GOLD, 'gilded');
  b.box(0, 6.8, 0, 2.7, 0.55, 1.8, '#f1cb70');
  // Radial paving and recessed relief panels remain wholly inside the island.
  for(let i=0;i<24;i++) {
    const a=i*Math.PI/12;
    b.box(Math.sin(a)*20,.28,Math.cos(a)*20,.22,.06,9,'#ddd0b6',a);
  }
  for(const x of [-7.1,7.1])for(const z of [-7.1,7.1]) {
    b.box(x,2.8,z+2.1,4.6,1.4,.12,'#b2a082');
    b.box(x,4,z+2.2,5.2,.24,.35,'#e7dcc5');
  }
}
const builders: Record<string, (b: LandmarkBuilder, detail: boolean) => void> = {
  palace,
  gate,
  golden,
  traimit,
  icon,
  khaosan,
  swing,
  democracy,
  hua: buildHuaLamphong,
};
export function reviewedLandmark(l: Landmark) {
  const make = builders[l.id!];
  if (!make) return;
  const levels = [true, false].map((detail) => {
    const b = new LandmarkBuilder();
    make(b, detail);
    return b.finish(`bangkok-${l.id}-${detail ? 'hero' : 'distant'}-v4`);
  });
  const lod = new T.LOD();
  lod.addLevel(levels[0]!, 0);
  lod.addLevel(levels[1]!, l.id === 'palace' ? 240 : 170, 0.15);
  lod.userData.authoredAsset = `bangkok-${l.id}-v4`;
  lod.userData.nightMaterials = levels.flatMap((g) => g.userData.nightMaterials);
  return lod;
}
