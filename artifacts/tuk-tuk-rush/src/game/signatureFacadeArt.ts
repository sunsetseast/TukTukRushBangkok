import * as T from 'three';
import type { FacadeApi } from './miniatureFacade';
import type { SignatureId } from './signatureCorridor';

/**
 * Authored miniature-world 3D detail for the seven storefronts in the Yaowarat
 * showcase. Names/addresses in signatureCorridor are factual; artwork here is
 * ORIGINAL and reference-inspired, not copied logos or dimensioned elevations.
 *
 * All coordinates are local to the building frontage (u sideways, v streetward),
 * passed through the same facade transform as the structural collision shell.
 * No freestanding supports on the drivable asphalt.
 */
export function buildSignatureFacade(
  api: FacadeApi,
  o: { id: SignatureId; W: number; D: number; H: number; sign: number },
) {
  const { id, W, D, H, sign } = o;
  const F = D / 2;
  const add = (material: 'metal' | 'plaster' | 'glass' | 'cloth', color: string,
    geo: T.BufferGeometry, x: number, y: number, front: number) => {
    api.add(material, color, geo, x, y, front);
    // Facade batching creates its own baked copy of the mesh.
    geo.dispose();
  };
  const block = (m: 'metal' | 'plaster' | 'glass' | 'cloth', col: string,
    w: number, h: number, dep: number, u: number, y: number, v: number) =>
    add(m, col, new T.BoxGeometry(w, h, dep), u, y, v);
  const orb = (m: 'metal' | 'plaster' | 'glass' | 'cloth', col: string,
    radius: number, u: number, y: number, v: number) =>
    add(m, col, new T.SphereGeometry(radius, 10, 7), u, y, v);
  const round = (m: 'metal' | 'plaster' | 'glass' | 'cloth', col: string,
    r: number, depth: number, u: number, y: number, v: number) =>
    add(m, col, new T.CylinderGeometry(r, r, depth, 14).rotateX(Math.PI / 2), u, y, v);
  const rail = (col: string, y: number, v: number, count = 9) => {
    block('metal', col, W - 1.2, 0.11, 0.16, 0, y, v);
    for (let j = 0; j < count; j++) {
      const u = (j / (count - 1) - 0.5) * (W - 1.4);
      block('metal', col, 0.09, 0.73, 0.1, u, y - 0.4, v);
    }
  };
  const roofEmbellishment = (col: string, trim: string) => {
    block('plaster', col, W + 0.5, 0.45, 1.1, 0, H + 0.25, F + 0.12);
    block('metal', trim, W + 0.75, 0.13, 1.15, 0, H + 0.52, F + 0.12);
    for (const end of [-1, 1]) {
      block('plaster', col, 0.6, 1.0, 0.75, end * (W / 2 - 0.2), H + 0.66, F + 0.3);
      orb('metal', trim, 0.32, end * (W / 2 - 0.2), H + 1.29, F + 0.33);
    }
  };
  // Full-depth display windows make the actual driving-level frontage read as
  // OPEN commerce, not the dark hollow rectangles in the first WebGL review.
  // All are facade-mounted and entirely inside the established footprint.
  const goldShop = id === 'hua418' || id === 'thong444' || id === 'so456';
  const backdrop = goldShop ? '#a97937' : id === 'nai442' ? '#c7aa7e' : '#b3a78e';
  block('plaster', backdrop, W - 1.8, 2.65, 0.2, 0, 1.88, F + 0.34);
  for (const x of [-W * 0.31, 0, W * 0.31]) {
    block('metal', goldShop ? '#dfba68' : '#6c796b',
      0.12, 2.65, 0.32, x, 1.88, F + 0.47);
    block('metal', goldShop ? '#f0ce80' : '#d0c7a7',
      W * 0.23, 0.12, 0.48, x, 0.9, F + 0.6);
    if (goldShop) for (const y of [1.45, 2.2]) {
      block('metal', '#eed18b', W * 0.18, 0.09, 0.4, x, y, F + 0.66);
      for (const dx of [-0.55, 0, 0.55]) {
        add('metal', '#eac565',
          new T.TorusGeometry(0.16, 0.04, 6, 12),
          x + dx, y + 0.16, F + 0.73);
      }
    }
  }
  for (const x of [-W * 0.18, W * 0.18])
    block('plaster', '#ffdfa0', W * 0.21, 0.12, 0.25, x, 3.18, F + 0.55);
  // These pieces are all within or above the existing building collider.
  // Ground-level objects must remain behind the actual curb clearance.
  if (id === 'hua418') {
    // Distinctive gold-trading flagship: full-height ruby pilasters, gilded
    // window surrounds and the broad fascia / raised rooftop feature.
    for (const side of [-1, 1]) {
      const x = side * (W / 2 - 0.55);
      block('plaster', '#8e222c', 0.75, H - 1.4, 0.8, x, (H + 1.4) / 2, F + 0.38);
      block('metal', '#e2b84d', 0.23, H - 2.0, 0.84, x, (H + 1.8) / 2, F + 0.73);
    }
    block('metal', '#e8bf5f', W - 0.7, 0.35, 0.4, 0, 5.72, F + 0.64);
    block('plaster', '#a01f2c', W - 1.0, 1.25, 0.3, 0, 4.75, F + 0.67);
    api.sign(sign, 0, 4.78, F + 0.85, W - 1.35, 1.12);
    // Deliberately model a convex projecting canopy, not a generic flat slab.
    add('metal', '#e3c169',
      new T.CylinderGeometry(1.15, 1.15, W - 0.75, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
      0, 3.65, F + 1.0);
    for (let floor = 0; floor < 3; floor++) {
      const y = 7.35 + floor * 3.0;
      if (y + 1.2 > H) break;
      for (const x of [-W * 0.24, W * 0.24]) {
        block('metal', '#e6b84f', W * 0.34, 2.0, 0.2, x, y, F + 0.35);
        block('glass', '#547374', W * 0.29, 1.65, 0.1, x, y, F + 0.47);
      }
      rail('#b82e33', y - 1.32, F + 0.68, 11);
    }
    roofEmbellishment('#9c2630', '#efc562');
  } else if (id === 'nai442') {
    // The restaurant must read differently from the gold shops: white/red
    // horizontal fascia, exposed cooking counter, low awning and food details.
    block('plaster', '#f5f0dc', W - 0.3, 1.8, 0.35, 0, 4.65, F + 0.72);
    block('metal', '#bc302d', W - 0.45, 0.14, 0.45, 0, 5.66, F + 0.79);
    block('metal', '#bc302d', W - 0.45, 0.14, 0.45, 0, 3.68, F + 0.79);
    api.sign(sign, 0, 4.65, F + 0.96, W - 1.0, 1.4);
    block('cloth', '#b22d2a', W - 0.75, 0.18, 1.75, 0, 3.29, F + 1.02);
    for (const x of [-W * 0.34, W * 0.34]) {
      block('metal', '#bfc8c3', 0.09, 2.2, 0.1, x, 1.65, F + 1.3);
    }
    block('metal', '#a3b9b8', W * 0.83, 0.2, 0.94, 0, 1.35, F + 0.55);
    for (const x of [-2.5, -1.1, 0.4, 1.9]) {
      round('metal', '#b9c7c4', 0.43, 0.18, x, 1.59, F + 0.62);
      orb('plaster', '#e8dac1', 0.18, x, 1.72, F + 0.68);
    }
    // Stylized stockpots, ladles and cooking steam without dynamic particles.
    for (const x of [-2.0, 2.0]) {
      add('metal', '#9da9aa', new T.CylinderGeometry(0.47, 0.42, 0.49, 12), x, 1.83, F + 0.64);
      add('plaster', '#f6edd4', new T.TorusGeometry(0.4, 0.045, 4, 12).rotateX(Math.PI / 2), x, 2.1, F + 0.64);
    }
    rail('#8a5a44', 6.83, F + 0.35);
    roofEmbellishment('#dfceb0', '#c14f3a');
  } else if (id === 'thong444') {
    // Colored bands evoke Thong Bai's multicolored Thai-Chinese gold-shop
    // lightboxes without copying a proprietary logo or another branch photo.
    const colors = ['#c93034', '#dfb84e', '#1d8066', '#2b5b90'];
    block('plaster', '#af252d', W - 0.25, 2.28, 0.4, 0, 5.0, F + 0.56);
    colors.forEach((col, k) => {
      block('metal', col, W - 0.2 - k * 0.23, 0.10, 0.5,
        0, 6.15 - k * 0.11, F + 0.67 + k * 0.08);
      block('metal', col, W - 0.2 - k * 0.23, 0.10, 0.5,
        0, 3.83 + k * 0.11, F + 0.67 + k * 0.08);
    });
    api.sign(sign, 0, 4.98, F + 1.04, W - 1.1, 1.74);
    for (let f = 0; f < 4; f++) {
      const y = 7.9 + f * 3.1;
      if (y + 1.4 > H) break;
      for (const x of [-W * 0.24, W * 0.24]) {
        block('metal', '#d9b64c', W * 0.35, 2.25, 0.28, x, y, F + 0.4);
        block('glass', '#405d64', W * 0.29, 1.87, 0.14, x, y, F + 0.55);
        block('metal', '#1a7962', W * 0.33, 0.19, 0.25, x, y + 0.9, F + 0.56);
      }
      rail('#c12d37', y - 1.3, F + 0.84);
    }
    roofEmbellishment('#a9262f', '#ecc467');
  } else if (id === 'so456') {
    // Signature dragon-crowned vertical projecting sign: deliberately strong
    // silhouette from the chase camera, with brackets rooted in the facade.
    block('plaster', '#982832', W - 0.8, 1.55, 0.4, 0, 4.8, F + 0.45);
    api.sign(sign, 0, 4.8, F + 0.75, W - 1.4, 1.2);
    const x = -W * 0.30, v = F + 2.35, y = 11.3;
    for (const bracketY of [6.3, 10.1, 14.2])
      block('metal', '#7a4c36', 0.19, 0.24, 3.8, x, bracketY, F + 1.15);
    block('metal', '#a62d31', 2.95, 11.5, 1.22, x, y, v);
    block('metal', '#e9ba57', 2.72, 11.2, 1.3, x, y, v + 0.1);
    block('metal', '#a92531', 2.49, 10.95, 1.36, x, y, v + 0.16);
    api.vsign(sign, x, y, v + 0.9, 2.32, 10.5);
    // Crown: stylized original dragon-like ornamental creature rather than
    // an unauthorized copied manufacturer's crest.
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(-1.45, -0.15, 0),
      new T.Vector3(-1.18, 0.65, 0),
      new T.Vector3(-0.65, 0.95, 0),
      new T.Vector3(0.2, 0.48, 0),
      new T.Vector3(0.94, 0.65, 0),
      new T.Vector3(1.4, 1.1, 0),
    ]);
    add('metal', '#dfaf42', new T.TubeGeometry(curve, 24, 0.23, 7, false),
      x, y + 6.0, v + 0.65);
    orb('metal', '#edc35f', 0.35, x + 1.48, y + 7.0, v + 0.65);
    for (const offset of [-0.32, 0.32])
      add('metal', '#eac15c', new T.ConeGeometry(0.17, 0.8, 7),
        x + 1.45 + offset, y + 7.6, v + 0.65);
    for (const sx of [-1, 1]) {
      orb('metal', '#e9ba55', 0.35, x + sx * 1.15, y + 5.57, v + 0.6);
      block('metal', '#f0c76a', 0.22, 11.7, 0.25, x + sx * 1.48, y, v + 0.75);
    }
    roofEmbellishment('#aa2930', '#e0b35b');
  } else if (id === 'tea-house') {
    block('plaster', '#75684c', W - 1.0, 1.0, 0.3, 0, 4.8, F + 0.35);
    api.sign(sign, 0, 4.8, F + 0.57, W - 1.6, 0.82);
    for (let floor = 0; floor < 2; floor++) {
      const y = 6.4 + floor * 3.1;
      for (let k = -2; k <= 2; k++)
        block('metal', '#765c43', 0.15, 2.1, 0.4, k * (W - 2) / 5, y, F + 0.38);
      rail('#745d42', y - 1.23, F + 0.59, 12);
    }
    roofEmbellishment('#a28b6d', '#845f42');
  } else if (id === 'traditional-medicine') {
    const x = W * 0.30;
    block('plaster', '#e9e4cf', W - 0.7, 1.3, 0.25, 0, 4.7, F + 0.47);
    api.sign(sign, 0, 4.7, F + 0.62, W - 1.2, 1.1);
    block('metal', '#285d4d', 2.6, 2.6, 0.3, x, 7.8, F + 0.65);
    block('metal', '#e4ead7', 0.5, 2.0, 0.4, x, 7.8, F + 0.8);
    block('metal', '#e4ead7', 2.0, 0.5, 0.4, x, 7.8, F + 0.8);
    for (const a of [-3.6, -2.0, -0.4, 1.2]) {
      block('glass', '#8aa09a', 0.6, 1.5, 0.35, a, 1.7, F + 0.34);
      block('metal', '#d6ca9c', 0.6, 0.1, 0.4, a, 2.55, F + 0.41);
    }
    roofEmbellishment('#c7cab2', '#477e66');
  } else {
    // Old balcony-and-shutters silhouette to visually break gold-shop rhythm.
    for (let f = 0; f < 3; f++) {
      const y = 6.5 + f * 3.2;
      if (y + 1.5 > H) break;
      for (const x of [-W * 0.27, W * 0.27]) {
        block('plaster', '#e8d0b5', 2.6, 2.35, 0.2, x, y, F + 0.21);
        block('glass', '#406468', 1.8, 1.85, 0.12, x, y, F + 0.34);
      }
      rail('#594f43', y - 1.18, F + 0.65);
    }
    roofEmbellishment('#a87453', '#6d5141');
  }
}

/** Curated opposing shopfronts: original context facades, NOT named real sites. */
export function buildOppositeFacadeArt(
  api: FacadeApi,
  o: { index: number; W: number; D: number; H: number; sign: number },
) {
  const { index, W, D, H, sign } = o, F = D / 2;
  const box = (m: 'metal'|'plaster'|'glass'|'cloth', color: string,
    w: number, h: number, d: number, u: number, y: number, v: number) => {
    const g = new T.BoxGeometry(w, h, d);
    api.add(m, color, g, u, y, v); g.dispose();
  };
  const trim = ['#966443','#c8b597','#6f5047','#5b806a','#915f51','#486474','#ab704d'][index % 7]!;
  // Shaded storefront entry and sculpted surround distinguish the handmade
  // corridor from the dead-black default procedural shop entrances.
  box('plaster', '#9e886a', W - 1.9, 2.55, 0.22, 0, 1.81, F + 0.36);
  for (const x of [-W * 0.28, W * 0.28]) {
    box('metal', trim, 0.22, 2.55, 0.32, x, 1.81, F + 0.52);
  }
  if (index % 3 === 0) {
    for (const y of [6.0, 9.4, 12.8]) {
      if (y + 1.3 > H) break;
      box('plaster', '#b8a286', W - 0.8, 0.28, 0.9, 0, y - 1.2, F + 0.61);
      for (let j = -4; j <= 4; j++)
        box('metal', '#695344', 0.10, 0.83, 0.2, j * (W - 1.6) / 9, y - 0.75, F + 0.89);
    }
  } else if (index % 3 === 1) {
    for (const y of [7.0, 10.3, 13.6, 16.9]) {
      if (y + 1.2 > H) break;
      for (const x of [-W * 0.25, W * 0.25]) {
        box('metal', '#e1d2b6', W * 0.38, 2.65, 0.29, x, y, F + 0.33);
        box('glass', '#61838c', W * 0.30, 2.2, 0.12, x, y, F + 0.5);
      }
    }
    box('metal', '#caab73', W + 0.4, 0.5, 0.7, 0, H + 0.25, F + 0.3);
  } else {
    for (let f = 0; f < 3; f++) {
      const y = 6.7 + 3.0 * f;
      if (y + 1.3 > H) break;
      for (const x of [-W * 0.26, W * 0.26]) {
        box('metal', trim, 2.8, 2.1, 0.3, x, y, F + 0.27);
        box('glass', '#57716c', 1.65, 1.65, 0.12, x, y, F + 0.45);
        box('metal', '#a9af97', 0.15, 1.8, 0.2, x, y, F + 0.59);
      }
    }
    box('metal', trim, W - 0.2, 0.62, 1.2, 0, 3.6, F + 0.94);
  }
  api.sign(sign, 0, 4.65, F + 0.92, W - 1.5, 1.05);
  // Three-dimensional smaller projecting signs over the sidewalk (supports
  // attached to upper facades; no ground pole or collision intrusion).
  const side = index % 2 ? -1 : 1, sx = side * (W / 2 - 1);
  box('metal', trim, 0.14, 0.16, 1.5, sx, 8.0, F + 1.2);
  box('metal', trim, 0.14, 0.16, 1.5, sx, 11.0, F + 1.2);
  box('metal', trim, 1.2, 4.0, 1.3, sx, 9.35, F + 1.8);
  api.vsign(sign, sx, 9.35, F + 2.6, 0.95, 3.65);
}
