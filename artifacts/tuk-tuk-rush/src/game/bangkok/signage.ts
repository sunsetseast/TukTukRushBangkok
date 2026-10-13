import * as T from 'three';
import type { District, Obstacle } from '../types';
import { StaticBatch } from '../staticBatch';
import { buildSignAtlas, type SignEntry } from '../signArt';
import { familyForRegion } from './architecture';

/**
 * Fictional trade-type signs, in actual Thai/Chinese lettering. Uses the same
 * locally loaded licensed sign fonts as the existing Chinatown artwork.
 * Never labels a generic facade as a real business or copies a logo.
 */
const ENTRIES: SignEntry[] = [
  { key: 'noodle', text: 'ก๋วยเตี๋ยว', style: 'noodle', variant: 0 },
  { key: 'gold', text: 'ร้านทอง', style: 'gold', variant: 0 },
  { key: 'tea', text: 'ชาไทย', style: 'noodle', variant: 1 },
  { key: 'coffee', text: 'กาแฟ', style: 'heritage', variant: 0 },
  { key: 'food', text: 'ร้านอาหาร', style: 'noodle', variant: 0 },
  { key: 'fruit', text: 'ผลไม้', style: 'heritage', variant: 1 },
  { key: 'clothes', text: 'เสื้อผ้า', style: 'hotel', variant: 0 },
  { key: 'pharmacy', text: 'ร้านยา', style: 'pharmacy', variant: 0 },
  { key: 'hotel', text: 'โรงแรม', style: 'hotel', variant: 1 },
  { key: 'chinese-gold', text: '金店', style: 'gold', variant: 1 },
  { key: 'chinese-tea', text: '茶樓', style: 'heritage', variant: 0 },
  { key: 'chinese-noodle', text: '麵', style: 'noodle', variant: 1 },
];

const REGION_SHOPS: Record<string, number[]> = {
  chinatown: [0, 1, 2, 4, 9, 10, 11], talatnoi: [0, 2, 3, 4, 10],
  oldtown: [0, 3, 4, 5, 7], khaosan: [0, 2, 3, 6, 8],
  westbank: [0, 2, 3, 4, 5], siam: [3, 6, 7, 8],
  sukhumvit: [3, 4, 6, 7, 8], silom: [3, 6, 7, 8],
  icon: [3, 4, 6, 8], south: [0, 2, 3, 4],
  north: [0, 4, 5, 6],
};

/** DOM-only: Node geometry tests still run without a canvas document. */
export function buildBangkokSigns(d: District) {
  const atlas = buildSignAtlas(ENTRIES), batch = new StaticBatch();
  const root = new T.Group();
  const matH = new T.MeshStandardMaterial({
    map: atlas.h.tex, emissiveMap: atlas.h.tex, emissive: '#ffffff',
    emissiveIntensity: .16, roughness: .57, side: T.DoubleSide,
  });
  const matV = new T.MeshStandardMaterial({
    map: atlas.v.tex, emissiveMap: atlas.v.tex, emissive: '#ffffff',
    emissiveIntensity: .16, roughness: .59, side: T.DoubleSide,
  });
  const tileGeo = (index: number, vertical: boolean) => {
    const { cols, rows } = vertical ? atlas.v : atlas.h;
    const geo = new T.PlaneGeometry(1, 1), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, ((index % cols) + u) / cols, (rows - 1 - Math.floor(index / cols) + v) / rows);
    }
    uv.needsUpdate = true;
    return geo;
  };
  const horizontal = ENTRIES.map((_, i) => tileGeo(i, false));
  const vertical = ENTRIES.map((_, i) => tileGeo(i, true));
  const identity = new T.Object3D();
  const place = (geo: T.BufferGeometry, material: T.Material, b: Obstacle,
    u: number, y: number, v: number, w: number, h: number, rotation = 0) => {
    const yaw = b.yaw ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
    identity.position.set(b.x + c * u + s * v, y, b.z - s * u + c * v);
    identity.rotation.set(0, yaw + rotation, 0);
    identity.scale.set(w, h, 1);
    identity.updateMatrix();
    batch.add(geo, material, [identity.matrix.clone()], [new T.Color('#ffffff')]);
  };
  d.buildings.forEach((b, i) => {
    const options = REGION_SHOPS[b.regionId ?? ''] ?? [0, 3, 4, 5, 7];
    const key = options[(i + Math.floor(Math.abs(b.x) / 75)) % options.length]!;
    const shopHeight = Math.min(3.25, b.height * .36), front = b.d / 2;
    // Constrain readable lettering to a single facade plate. No giant signs
    // hanging over roads, and no per-building text canvas allocations.
    place(horizontal[key]!, matH, b, 0, shopHeight + 1, front + .715, b.w - 2, 1.34);
    if (familyForRegion(b.regionId) === 'market' && i % 3 !== 0 && b.height > 10) {
      const u = (i % 2 ? -1 : 1) * b.w * .38;
      const y = Math.min(b.height - 2, 8);
      for (const side of [-1, 1]) {
        place(vertical[key]!, matV, b, u + side * .68, y,
          front + 1.18, 1.05, 5.5, side * Math.PI / 2);
      }
    }
  });
  batch.finish().forEach(chunk => { chunk.name = 'BangkokSign'; root.add(chunk); });
  return root;
}
