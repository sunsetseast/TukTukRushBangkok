import type { Point } from './types';

/** OSM traced control points, simplified for an arcade miniature.
 * Geographic data © OpenStreetMap contributors, ODbL 1.0.
 * https://www.openstreetmap.org/copyright
 * Source ways and adaptations are documented in docs/graphics/reconstruction/RESEARCH.md.
 * A uniform 0.55 compression keeps this playable district near 700m square.
 * North is -Z; no online map or geographic service is used at runtime.
 */
export const project = (lat: number, lon: number): Point => ({
  x: (lon - 100.5115) * 108120 * 0.55,
  z: -(lat - 13.7402) * 111320 * 0.55,
});

export const YAOWARAT_TRACE: Point[] = [
  [13.73788, 100.51284], [13.7383214, 100.5125341],
  [13.7390676, 100.5119582], [13.7394245, 100.511464],
  [13.7398142, 100.5108388], [13.7403072, 100.5099857],
  [13.7405464, 100.5095564], [13.7408564, 100.5087984],
  [13.741249, 100.508181], [13.7417769, 100.507528],
  [13.7419266, 100.5073688],
].map(([lat, lon]) => project(lat!, lon!));

// One-way southeast, opposite to Yaowarat's northwest direction.
export const CHAROEN_TRACE: Point[] = [
  [13.7442221, 100.5074519], [13.7435028, 100.5083631],
  [13.7426538, 100.509439], [13.7418544, 100.5104514],
  [13.7409976, 100.5115257], [13.7404145, 100.5122566],
  [13.7396078, 100.5125024], [13.738437, 100.5128651],
  [13.7379717, 100.5129885],
].map(([lat, lon]) => project(lat!, lon!));

export const GATE_CENTER = project(13.73712, 100.5129);
// Landmark approaches/footprints are expanded and displaced modestly to prevent
// the miniature compression from closing its playable roads.
export const TEMPLE_CENTER: Point = { x: 155, z: 170 };
export const STATION_CENTER: Point = { x: 280, z: 20 };
export const PALETTE = ['#d6baa1', '#9bbdb2', '#e4ce9d', '#c58c7d', '#b1b9a0', '#ebd6b7', '#a8b5c7'];

/** Original sign compositions, not copied logos or commercial artwork.
 * Brand names are factual reference labels; publication clearance is pending.
 */
export const SIGN_NAMES = ['ฮั่วเซ่งเฮง', '耀華力路', 'ก๋วยเตี๋ยว', 'ร้านทอง', 'อาหาร', 'กาแฟ', 'ยา', 'เยาวราช'];
