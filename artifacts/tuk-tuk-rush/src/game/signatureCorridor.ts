import type { Obstacle, Road, RoadNode } from './types';
import { project } from './mapData';

/**
 * Reference-led, ART-DIRECTED YAOWARAT SLICE.
 *
 * Addresses and business names are verified; the arcade miniature's plot
 * positions, frontage widths, and neighbors are NOT surveyed geolocation.
 * Never present these locations as actual GPS matches. The planned 418–456
 * frontage is a curated contiguous arcade storefront slice on the south-west side of
 * Yaowarat. Parcel-level positions remain unverified.
 */
export type SignatureId =
  | 'hua418' | 'tea-house' | 'nai442' | 'thong444'
  | 'traditional-medicine' | 'so456' | 'heritage-balcony';

export type SignatureSpec = {
  id: SignatureId;
  name: string;
  address?: string;
  sign: string;
  style: NonNullable<Obstacle['style']>;
  height: number;
  color: string;
  source?: string;
  verifiedBusiness: boolean;
  /** WGS84 reference position or specifically invented contextual infill site. */
  latitude: number;
  longitude: number;
  /** Side of actual in-game directed Yaowarat road: +1 south-west, -1 north-east. */
  side: -1 | 1;
  positionEvidence?: string;
};

/**
 * THE POSITION ORDER IS REFERENCE-LED, NOT NUMERIC STREET-ADDRESS ORDER.
 * Four geotagged business positions were independently checked against the
 * OSM-derived Yaowarat road trace. Thong Bai appears on the opposing frontage.
 * Contextual sites are explicitly fictional and their coordinates are only
 * authored positions to support a continuous arcade-driving scene.
 */
export const SIGNATURE_SEQUENCE: readonly SignatureSpec[] = [
  { id: 'hua418', name: 'Hua Seng Heng — Yao Phanit branch',
    address: '418–420 Yaowarat Road', sign: 'ฮั่วเซ่งเฮง',
    style: 'gold', height: 20.5, color: '#c4ae8b', verifiedBusiness: true,
    latitude: 13.740462, longitude: 100.50964, side: 1,
    positionEvidence: 'https://maps.me/catalog/shops/shop-jewelry/so-seng-heng-goldsmith-4611686021524224091/',
    source: 'https://www.huasengheng.com/en/contact/' },
  { id: 'tea-house', name: 'Arcade-adapted tea and herbal shop',
    sign: 'ชาเยาวราช', style: 'heritage', height: 13.4,
    color: '#c7ab86', verifiedBusiness: false,
    latitude: 13.74053, longitude: 100.50982, side: -1 },
  { id: 'nai442', name: 'Nai Ek Roll Noodles',
    address: '442 Yaowarat Soi 9', sign: 'ก๋วยจั๊บนายเอ็ก',
    style: 'noodle', height: 15.5, color: '#d9c6a0', verifiedBusiness: true,
    latitude: 13.740258, longitude: 100.509982, side: 1,
    positionEvidence: 'https://johorkaki.blogspot.com/2019/10/nai-ek-roll-noodles-michelin-plate-kway.html',
    source: 'https://www.timeout.com/bangkok/restaurants/nai-ek-roll-noodles' },
  { id: 'thong444', name: 'Thong Bai Yaowaraj — branch 1',
    address: '444–444/1 Yaowarat Road', sign: 'ทองใบเยาวราช',
    style: 'gold', height: 22.3, color: '#d4b385', verifiedBusiness: true,
    latitude: 13.74042, longitude: 100.50994, side: -1,
    positionEvidence: 'https://bangkok.worldplaces.me/th/review/78162130.html',
    source: 'https://thongbai.com/' },
  { id: 'traditional-medicine', name: 'Arcade-adapted traditional pharmacy',
    sign: 'ร้านขายยา', style: 'pharmacy', height: 13.7,
    color: '#b9cfc4', verifiedBusiness: false,
    latitude: 13.74068, longitude: 100.50940, side: 1 },
  { id: 'so456', name: 'So Seng Heng',
    address: '456 Yaowarat Road', sign: 'โซวเซ่งเฮง',
    style: 'gold', height: 24.0, color: '#cda76a', verifiedBusiness: true,
    latitude: 13.73989, longitude: 100.51048, side: 1,
    positionEvidence: 'https://mapcarta.com/N3096836187',
    source: 'https://www.sosengheng.com/contact-us' },
  { id: 'heritage-balcony', name: 'Arcade-adapted heritage commercial shophouse',
    sign: 'เยาวราช', style: 'heritage', height: 17.0,
    color: '#cca178', verifiedBusiness: false,
    latitude: 13.740055, longitude: 100.51024, side: 1 },
];

export type StreetSegment = { r: Road; a: RoadNode; b: RoadNode };

/**
 * Samples a connected span of the ACTUAL in-game road graph, so the handcrafted
 * row conforms to curves. Its position is authored, not inferred from address
 * numbers. The opposite frontage remains part of the procedural district.
 */
export function signaturePlots(segments: StreetSegment[]): Obstacle[] {
  const road = segments.filter(s => s.r.name === 'Yaowarat Road' &&
    s.a.id.startsWith('yaowarat:') && s.b.id.startsWith('yaowarat:'));
  if (!road.length) throw new Error('Signature Yaowarat graph trace is missing');
  return SIGNATURE_SEQUENCE.map(spec => {
    const target = project(spec.latitude, spec.longitude);
    let best = {
      dist: Infinity,
      t: 0,
      segment: road[0]!,
    };
    for (const segment of road) {
      const dx = segment.b.x - segment.a.x, dz = segment.b.z - segment.a.z;
      const lengthSquared = dx * dx + dz * dz;
      const t = lengthSquared
        ? Math.max(0, Math.min(1, ((target.x - segment.a.x) * dx +
          (target.z - segment.a.z) * dz) / lengthSquared))
        : 0;
      const x = segment.a.x + t * dx, z = segment.a.z + t * dz;
      const dist = Math.hypot(target.x - x, target.z - z);
      if (dist < best.dist) best = { dist, t, segment };
    }
    const { segment, t } = best;
    const dx = segment.b.x - segment.a.x, dz = segment.b.z - segment.a.z;
    const length = Math.hypot(dx, dz);
    const ux = dx / length, uz = dz / length;
    const depth = 12.5;
    // Re-establish arcade clearance from the traced road centreline, instead
    // of copying tiny GPS-to-road offsets that don't fit the tuk-tuk's width.
    const off = segment.r.width / 2 + depth / 2 + 5.85;
    const side = spec.side;
    return {
      x: segment.a.x + dx * t + uz * off * side,
      z: segment.a.z + dz * t - ux * off * side,
      yaw: Math.atan2(-uz * side, ux * side),
      w: 10.4, d: depth, height: spec.height, color: spec.color,
      style: spec.style, showcase: true, sign: spec.sign,
      signatureId: spec.id,
    };
  });
}

/**
 * Curated OPPOSITE FRONTAGE infill, without falsely identifying unverified
 * neighbors as real shops. Mirrors the geometric road-sampling reference but
 * uses independent original architectural silhouettes and trade signboards.
 * Candidates intersecting junction arms are discarded by world.clear().
 */
export function signatureOppositePlots(segments: StreetSegment[]): Obstacle[] {
  const styles: NonNullable<Obstacle['style']>[] =
    ['heritage', 'hotel', 'noodle', 'pharmacy', 'heritage', 'hotel', 'noodle'];
  // Functional Chinese category signs on ORIGINAL fictional shops. These are
  // not falsely attributed to actual Yaowarat businesses.
  const signs = ['茶樓', '旅店', '麵館', '藥房', '布莊', '旅店', '飯店'];
  return signaturePlots(segments).map((hero, i) => {
    const yaw = hero.yaw ?? 0;
    const normalX = Math.sin(yaw), normalZ = Math.cos(yaw);
    const plotOffset = 7 + 12.5 / 2 + 5.85;
    const heights = [15.2, 23.1, 14.6, 17.4, 16.0, 21.2, 14.4];
    return {
      x: hero.x + normalX * plotOffset * 2,
      z: hero.z + normalZ * plotOffset * 2,
      yaw: yaw + Math.PI,
      w: 13.7, d: 12.5, height: heights[i]!,
      color: ['#bd9d79', '#d5c5a1', '#cfad92', '#bfd2c4', '#d7bb9c', '#acb6bd', '#b8a98e'][i]!,
      style: styles[i]!, showcase: true,
      sign: signs[i]!,
      signatureInfillIndex: i,
    };
  });
}
