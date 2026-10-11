import type { Obstacle, Road, RoadNode } from './types';

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
};

export const SIGNATURE_SEQUENCE: readonly SignatureSpec[] = [
  { id: 'hua418', name: 'Hua Seng Heng — Yao Phanit branch',
    address: '418–420 Yaowarat Road', sign: 'ฮั่วเซ่งเฮง',
    style: 'gold', height: 20.5, color: '#c4ae8b', verifiedBusiness: true,
    source: 'https://www.huasengheng.com/en/contact/' },
  { id: 'tea-house', name: 'Arcade-adapted tea and herbal shop',
    sign: 'ชาเยาวราช', style: 'heritage', height: 13.4,
    color: '#c7ab86', verifiedBusiness: false },
  { id: 'nai442', name: 'Nai Ek Roll Noodles',
    address: '442 Yaowarat Soi 9', sign: 'ก๋วยจั๊บนายเอก',
    style: 'noodle', height: 15.5, color: '#d9c6a0', verifiedBusiness: true,
    source: 'https://www.timeout.com/bangkok/restaurants/nai-ek-roll-noodles' },
  { id: 'thong444', name: 'Thong Bai Yaowaraj — branch 1',
    address: '444–444/1 Yaowarat Road', sign: 'ทองใบเยาวราช',
    style: 'gold', height: 22.3, color: '#d4b385', verifiedBusiness: true,
    source: 'https://thongbai.com/' },
  { id: 'traditional-medicine', name: 'Arcade-adapted traditional pharmacy',
    sign: 'ร้านขายยา', style: 'pharmacy', height: 13.7,
    color: '#b9cfc4', verifiedBusiness: false },
  { id: 'so456', name: 'So Seng Heng',
    address: '456 Yaowarat Road', sign: 'โซวเซ่งเฮง',
    style: 'gold', height: 24.0, color: '#cda76a', verifiedBusiness: true,
    source: 'https://www.sosengheng.com/contact-us' },
  { id: 'heritage-balcony', name: 'Arcade-adapted heritage commercial shophouse',
    sign: 'เยาวราช', style: 'heritage', height: 17.0,
    color: '#cca178', verifiedBusiness: false },
];

export type StreetSegment = { r: Road; a: RoadNode; b: RoadNode };

/**
 * Samples a connected span of the ACTUAL in-game road graph, so the handcrafted
 * row conforms to curves. Its position is authored, not inferred from address
 * numbers. The opposite frontage remains part of the procedural district.
 */
export function signaturePlots(segments: StreetSegment[]): Obstacle[] {
  const yaowarat = segments.filter(s => s.r.name === 'Yaowarat Road' &&
    s.a.id.startsWith('yaowarat:') && s.b.id.startsWith('yaowarat:'));
  const start = yaowarat.findIndex(s => s.a.id === 'yaowarat:3');
  const finish = yaowarat.findIndex(s => s.b.id === 'yaowarat:6');
  if (start < 0 || finish < start) throw new Error('Signature Yaowarat trace is missing');
  const path = yaowarat.slice(start, finish + 1).map(s => ({
    ...s, length: Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z),
  }));
  const total = path.reduce((sum, s) => sum + s.length, 0);
  const leading = 12, trailing = 12;
  if (total < 98) throw new Error('Yaowarat showcase corridor is too short');
  const plots: Obstacle[] = [];
  SIGNATURE_SEQUENCE.forEach((spec, i) => {
    let distance = leading + (total - leading - trailing) * i / (SIGNATURE_SEQUENCE.length - 1);
    let segment = path[path.length - 1]!;
    for (const s of path) {
      if (distance <= s.length) { segment = s; break; }
      distance -= s.length;
    }
    const ux = (segment.b.x - segment.a.x) / segment.length;
    const uz = (segment.b.z - segment.a.z) / segment.length;
    const depth = 12.5, width = 10.4;
    const side = 1; // south-west frontage, away from the connecting northern roads
    const off = segment.r.width / 2 + depth / 2 + 5.85;
    plots.push({
      x: segment.a.x + ux * distance + uz * off * side,
      z: segment.a.z + uz * distance - ux * off * side,
      yaw: Math.atan2(-uz * side, ux * side),
      w: width, d: depth, height: spec.height, color: spec.color,
      style: spec.style, showcase: true,
      sign: spec.sign, signatureId: spec.id,
    });
  });
  return plots;
}
