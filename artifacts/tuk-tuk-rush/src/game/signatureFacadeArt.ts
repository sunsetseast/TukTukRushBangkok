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
  // Individual sign cabinets stand above pavement on structural arms, with
  // no road-surface posts. Unique proportions reflect real Yaowarat's mixed
  // large projecting signs; text remains faithful to the named Thai business.
  const projectingLightbox = (opts: {
    u: number; y: number; height: number; width: number;
    color: string; border: string; projection?: number; crown?: 'coin' | 'arch';
  }) => {
    const v = F + (opts.projection ?? 2.15);
    for (const yy of [opts.y - opts.height * 0.31, opts.y + opts.height * 0.31])
      block('metal', '#71604c', 0.16, 0.16, 2.85, opts.u, yy, F + 1.05);
    block('metal', '#685d51', opts.width + 0.4, opts.height + 0.7, 0.87, opts.u, opts.y, v);
    block('metal', opts.border, opts.width + 0.27, opts.height + 0.44, 0.94, opts.u, opts.y, v + 0.07);
    block('plaster', opts.color, opts.width + 0.08, opts.height + 0.14, 1.01, opts.u, opts.y, v + 0.14);
    api.vsign(sign, opts.u, opts.y, v + 0.3, opts.width, opts.height,
      (opts.width + 0.4) / 2 + 0.04);
    // Inset strips and corner bosses break the default cardboard rectangle.
    for (const dx of [-1, 1]) {
      const x = opts.u + dx * (opts.width / 2 + 0.13);
      block('metal', opts.border, 0.12, opts.height + 0.50, 0.2, x, opts.y, v + 0.65);
      for (const dy of [-1, 1])
        orb('metal', '#edce83', 0.15, x, opts.y + dy * opts.height / 2, v + 0.65);
    }
    if (opts.crown === 'coin') {
      round('metal', opts.border, opts.width * 0.56, 0.21, opts.u, opts.y + opts.height/2 + 0.72, v + 0.24);
      round('metal', '#f1d38b', opts.width * 0.38, 0.24, opts.u, opts.y + opts.height/2 + 0.73, v + 0.4);
    } else if (opts.crown === 'arch') {
      add('metal', opts.border,
        new T.TorusGeometry(opts.width * 0.52, 0.19, 6, 16, Math.PI),
        opts.u, opts.y + opts.height/2 + 0.05, v + 0.25);
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
  // Distinct structural cornice, shutter recesses and streetward lightboxes.
  // All hero shops are now built WITHOUT composeFacade's repeated silhouettes.
  const frameColor = id === 'nai442' ? '#b14a3b' : '#d7b587';
  block('plaster', frameColor, W - 0.8, 0.23, 0.64, 0, 3.63, F + 0.3);
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - 0.62);
    block('plaster', id === 'hua418' ? '#e5d8c7' : '#cbb08b',
      0.7, 3.9, 0.54, x, 1.95, F + 0.16);
  }
  for (const x of [-W*0.22, W*0.22]) {
    // Warm lit transoms on the upper shopfront bring the trading floor
    // out of the black void visible in the original PR #4 screenshots.
    block('glass', goldShop ? '#bd9b66' : '#e1dbc3',
      W * 0.30, 0.44, 0.07, x, 3.22, F + 0.51);
  }
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
    // Cream stone arched portal, inspired by the documented 2022 renovated
    // Hua Seng Heng Yaowarat storefront (reference, not measured blueprints).
    const arcadeR = Math.min(3.6, W * 0.35);
    const portalY = 7.95;
    block('plaster', '#eee2d0', W + 0.18, 0.56, 0.82, 0, 8.25, F + 0.31);
    for (const side of [-1, 1]) {
      block('plaster', '#f0e5d8', 0.62, 4.0, 0.66,
        side * arcadeR, 5.35, F + 0.62);
      block('metal', '#be9b6d', 0.12, 3.6, 0.3,
        side * (arcadeR - 0.35), 5.5, F + 0.99);
    }
    add('plaster', '#ede0d0', new T.TorusGeometry(arcadeR, 0.31, 8, 32, Math.PI),
      0, portalY, F + 0.57);
    add('metal', '#be9a6b', new T.TorusGeometry(arcadeR - 0.31, 0.072, 4, 32, Math.PI),
      0, portalY, F + 0.94);
    block('glass', '#71827f', arcadeR * 1.5, 0.55, 0.1, 0, 7.30, F + 0.30);
    for (let i = -3; i <= 3; i++)
      block('metal', '#c5ae87', 0.055, 0.63, 0.1, i * arcadeR/4, 7.30, F + 0.48);
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
    projectingLightbox({
      u: W*0.30, y: 11.1, height: 7.5, width: 1.6,
      color: '#8b222d', border: '#d1ac5e', crown: 'arch',
    });
    roofEmbellishment('#e1d2bc', '#b99268');
  } else if (id === 'nai442') {
    // Brick-red open restaurant, white menu board, fluorescent canopy, visible
    // steel counter and small hanging lamps seen at the genuine 442 entrance.
    // No giant invented neon dragon on this modest noodle restaurant.
    block('plaster', '#7c3f36', W - 0.5, H - 5.1, 0.35,
      0, (H + 5.1)/2, F + 0.22);
    const cols = W > 10 ? [-W*0.26, W*0.26] : [0];
    for (const x of cols) {
      block('metal', '#d9d1bd', W * 0.38, 2.5, 0.23, x, 7.45, F + 0.45);
      block('glass', '#46676c', W * 0.34, 2.18, 0.08, x, 7.45, F + 0.6);
      block('metal', '#ded9c9', 0.14, 2.35, 0.18, x, 7.45, F + 0.68);
      block('metal', '#ded9c9', W * 0.34, 0.14, 0.18, x, 7.45, F + 0.68);
    }
    for (const x of [-W*0.28, 0, W*0.28]) {
      block('metal', '#606d6f', 0.09, 0.7, 0.13, x, 2.72, F + 1.07);
      orb('plaster', '#fae9be', 0.22, x, 2.34, F + 1.07);
    }
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
    // Nai Ek's small perpendicular lightbox is restrained beside the main
    // white menu sign; it must not compete with the big gold-shop signs.
    projectingLightbox({
      u: -W*0.31, y: 7.1, height: 3.65, width: 0.94,
      color: '#f1eee2', border: '#b64c45', projection: 1.75,
    });
    rail('#8a5a44', 6.83, F + 0.35);
    roofEmbellishment('#dfceb0', '#c14f3a');
  } else if (id === 'thong444') {
    // Distinct branch 444 identity: layered jewelry shop sign, restrained
    // blue-green corner trim and illuminated glass showcases. BangkokType's
    // highly colorful sign photograph is of branch 152–154, NOT this one.
    for (const x of [-W * 0.28, W * 0.28]) {
      block('metal', '#177567', 0.35, 3.5, 0.35, x, 1.85, F + 0.64);
      block('metal', '#f1d48a', 0.56, 0.24, 0.45, x, 3.47, F + 0.71);
    }
    for (let k=0;k<5;k++) {
      const x=(k-2)*((W-2)/5);
      block('metal', '#efc265', 0.13, 0.47, 0.18, x, 4.09, F + 0.96);
    }
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
    projectingLightbox({
      u: -W*0.30, y: 12.1, height: 8.5, width: 1.65,
      color: '#a72334', border: '#e5be61', crown: 'coin',
    });
    roofEmbellishment('#a9262f', '#ecc467');
  } else if (id === 'so456') {
    // More detailed arched upper bays, concrete cornices and front-column
    // profiles distinguish this real shop from every other gold facade.
    for (const x of [-W*0.27, W*0.27]) {
      for (let f=0;f<2;f++) {
        const yy = 7.1 + f*3.45;
        block('plaster', '#efdfcc', W*0.34, 2.72, 0.28, x, yy, F+0.4);
        block('glass', '#5b7069', W*0.27, 2.23, 0.08, x, yy, F+0.56);
        block('metal', '#b4976e', W*0.30, 0.09, 0.16, x, yy+0.9, F+0.63);
      }
    }
    for (const y of [9.1, 12.55, 16.5]) {
      if (y + 1 > H) continue;
      block('metal', '#c5a477', W-0.35, 0.19, 0.9, 0, y, F+0.49);
    }
    // Reference-inspired monumental pale arch on the So Seng Heng commercial
    // elevation: unmistakably different from a generic red gold shop.
    // The actual facade in archival street photographs includes broad white
    // masonry around a dramatically curved central upper bay. This is a new,
    // original miniature rendition, NOT a measured or exact building model.
    const archRadius = Math.min(W * 0.39, 3.8);
    const archCenter = H - archRadius - 1.45;
    for (const side of [-1, 1]) {
      const px = side * archRadius;
      block('plaster', '#eadfd1', 0.78, archCenter - 5.7, 0.62,
        px, (archCenter + 5.7) / 2, F + 0.66);
      block('metal', '#c5a06a', 0.13, archCenter - 5.9, 0.69,
        px, (archCenter + 5.9) / 2, F + 0.96);
    }
    add('plaster', '#e9dfd1',
      new T.TorusGeometry(archRadius, 0.39, 8, 36, Math.PI),
      0, archCenter, F + 0.82);
    add('metal', '#c9a877',
      new T.TorusGeometry(archRadius - 0.4, 0.095, 5, 36, Math.PI),
      0, archCenter, F + 0.98);
    block('plaster', '#eee3d2', W + 0.2, 0.8, 0.9, 0, H - 0.36, F + 0.5);
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
    api.vsign(sign, x, y, v + 0.16, 2.32, 10.5, 1.55);
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
    // Historic wooden shutters and canopies in this FICTIONAL context unit.
    block('plaster', '#bfa988', W-0.55, H-4.4, 0.24, 0, (H+4.4)/2, F+0.18);
    for (const x of [-W*0.24, W*0.24])
      for (let i=0;i<2;i++) {
        const y=6.7 + i*3.1;
        block('metal', '#614b38', W*0.34, 2.16, 0.18, x, y, F+0.42);
        for (let slat=-3;slat<=3;slat++)
          block('metal', '#8b704f', W*0.30, 0.075, 0.20, x, y+slat*0.26, F+0.56);
      }
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
    block('plaster', '#b9c9b2', W-0.6, H-4.1, 0.2, 0, (H+4.1)/2, F+0.21);
    for (const x of [-W*0.22, W*0.22])
      for (const y of [6.7, 9.65]) {
        if (y+1.5 >= H) continue;
        block('metal', '#486c5d', W*0.34, 2.25, 0.22, x, y, F+0.34);
        block('glass', '#819c86', W*0.29, 1.8, 0.09, x, y, F+0.49);
      }
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
    // Older corner commercial block with patched ochre plaster and deep
    // inset timber window shutters, not a generic fresh paint palette.
    block('plaster', '#b38766', W-0.6, H-4.2, 0.2, 0, (H+4.2)/2, F+0.22);
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
  // Intentional Chinese trade-name signage, NOT invented real storefronts.
  // Unlike repeated 4m blades, these silhouette heights, mounts, construction,
  // language and surface tones vary from shop to shop, as in real Yaowarat.
  const side = index % 2 ? -1 : 1, sx = side * (W / 2 - 0.83);
  const tall = [6.3, 7.8, 5.7, 6.0, 5.0, 7.3, 5.8][index % 7]!;
  const y = Math.min(H - tall/2 - 0.9, Math.max(6.8, tall/2 + 4.9));
  const outward = F + (index % 3 === 0 ? 2.3 : 1.95);
  const signW = [1.85,1.9,1.6,1.7,1.55,1.9,1.6][index % 7]!;
  const border = index % 3 === 0 ? '#ecb852' :
    index % 3 === 1 ? '#d6d2a7' : '#d59054';
  const panel = index % 3 === 0 ? '#9d2930' :
    index % 3 === 1 ? '#254a59' : '#6d3a2e';
  for (const yy of [y - tall * 0.31, y + tall * 0.31]) {
    box('metal', '#766554', 0.16, 0.18, 3.3, sx, yy, F + 0.95);
    box('metal', border, 0.26, 0.22, 0.55, sx, yy, outward - 1.0);
  }
  // The cabinet is narrow along the facade, extends into the sidewalk over
  // head-height, and its lettering is placed on BOTH OUTSIDE faces.
  box('metal', '#716358', 0.52, tall + 0.50, signW + 0.25, sx, y, outward);
  box('metal', border, 0.47, tall + 0.29, signW + 0.31, sx, y, outward + 0.02);
  box('metal', panel, 0.39, tall + 0.08, signW + 0.34, sx, y, outward + 0.03);
  api.vsign(sign, sx, y, outward + 0.06, signW, tall, 0.25);
  for (const dy of [-1, 1]) {
    box('metal', border, 0.63, 0.13, signW + 0.5,
      sx, y + dy * (tall/2 + 0.13), outward + 0.02);
  }
  if (index % 3 === 0) {
    // Vintage round medallions and curved crown evoke old metal sign-makers.
    const g = new T.TorusGeometry(0.52, 0.11, 5, 14);
    api.add('metal', '#f0bd60', g, sx, y + tall/2 + 0.73, outward);
    g.dispose();
  } else if (index % 3 === 1) {
    box('metal', '#c2a779', 0.68, 0.82, signW + 0.4,
      sx, y + tall/2 + 0.42, outward);
  }

}
