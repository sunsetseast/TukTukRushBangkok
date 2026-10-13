import type { District, Obstacle } from '../types';

/**
 * Street-level Bangkok art kit. All placement is relative to the colliding
 * parcels built in world.ts, never a second unrelated placement graph.
 * Solid masses and readable ground floors render even in Fast mode.
 * Small window/balcony trims may be hidden in Fast mode.
 */
export type Piece = (x: number, y: number, z: number, w: number, h: number, depth: number, color: string, yaw: number) => void;
export type FacadeStats = { total: number; districts: string[]; market: number; heritage: number; modern: number };

type Family = 'market' | 'heritage' | 'modern' | 'riverside';
type Style = { family: Family; walls: string[]; trim: string; shop: string; awning: string; glass: string; accent: string };

const STYLES: Record<Family, Style> = {
  market: {
    family: 'market', walls: ['#d4ae83', '#e6c29a', '#c98c77', '#ead4b7', '#bba99a'],
    trim: '#5a413d', shop: '#243945', awning: '#ae3f37', glass: '#264c5a', accent: '#dbb453',
  },
  heritage: {
    family: 'heritage', walls: ['#e3caa4', '#cfb38e', '#e8d9bb', '#acc2af', '#b2c8c5'],
    trim: '#665a50', shop: '#465b56', awning: '#587f73', glass: '#415963', accent: '#d9a86b',
  },
  modern: {
    family: 'modern', walls: ['#9db1b9', '#b9c5cb', '#859da9', '#d4cec3', '#9caaab'],
    trim: '#425562', shop: '#263744', awning: '#3f7a86', glass: '#365c72', accent: '#73c8c2',
  },
  riverside: {
    family: 'riverside', walls: ['#dfc9a7', '#e4bda1', '#b7c6bb', '#eed7b6', '#a7b4ae'],
    trim: '#53615c', shop: '#3e5757', awning: '#ba765d', glass: '#486a70', accent: '#e9bd7f',
  },
};
const MARKET = new Set(['chinatown', 'khaosan', 'north']);
const HERITAGE = new Set(['oldtown', 'talatnoi']);
const MODERN = new Set(['siam', 'silom', 'sukhumvit']);
const RIVERSIDE = new Set(['westbank', 'icon', 'south']);
export function familyForRegion(id: string | undefined): Family {
  if (MARKET.has(id ?? '')) return 'market';
  if (HERITAGE.has(id ?? '')) return 'heritage';
  if (MODERN.has(id ?? '')) return 'modern';
  if (RIVERSIDE.has(id ?? '')) return 'riverside';
  return 'heritage';
}

/** All new ornament is static, deterministic and composed from small primitives. */
export function emitBangkokArchitecture(
  d: District,
  shell: Piece,
  trim: Piece,
  windows: Piece,
): FacadeStats {
  const visited = new Set<string>();
  const count: FacadeStats = { total: 0, districts: [], market: 0, heritage: 0, modern: 0 };
  d.buildings.forEach((b: Obstacle, i) => {
    const region = b.regionId ?? 'connector', family = familyForRegion(region), style = STYLES[family];
    visited.add(region);
    count.total++;
    if (family === 'modern') count.modern++;
    else if (family === 'market') count.market++;
    else count.heritage++;
    // yaw's local +Z axis faces the nearest road; +X is the storefront width.
    const yaw = b.yaw ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
    const X = (u: number, v: number) => b.x + c * u + s * v;
    const Z = (u: number, v: number) => b.z - s * u + c * v;
    const put = (kind: 'shell' | 'trim' | 'window', u: number, y: number, v: number,
      w: number, h: number, depth: number, color: string) => {
      (kind === 'shell' ? shell : kind === 'trim' ? trim : windows)(X(u, v), y, Z(u, v), w, h, depth, color, yaw);
    };
    const w = b.w, depth = b.d, h = b.height, front = depth / 2;
    const wall = style.walls[(i + Math.floor(Math.abs(b.x + b.z) / 90)) % style.walls.length]!;
    const floor = h > 26 ? 4.3 : 3.7;
    const shopHeight = Math.min(3.25, h * 0.36);
    const modern = family === 'modern', market = family === 'market';
    // Buildings keep their physical footprints; frontage depth does NOT push
    // the decorative shell into a traffic lane.
    put('shell', 0, h / 2, 0, w, h, depth, wall);
    put('shell', 0, h + .25, 0, w + .8, .5, depth + .8, style.trim);
    put('shell', 0, .28, front + .08, w - .3, .55, .24, style.trim);

    // Shopfronts, columns and projecting awnings provide a visible street-level
    // silhouette in both quality modes, rather than more uninterrupted wall.
    put('shell', 0, shopHeight / 2 + .55, front + .12, w - 2.4, shopHeight - .35, .22, style.shop);
    const bays = modern ? 3 : 2;
    for (let bay = 0; bay < bays; bay++) {
      const span = (w - 4) / bays, u = -w / 2 + 2 + span * (bay + .5);
      put('shell', u, shopHeight / 2 + .65, front + .28, span - .55, shopHeight - 1.1, .08, style.glass);
      put('trim', u, 1.75, front + .38, .15, 2.6, .14, style.accent);
    }
    for (const u of [-w / 2 + 1, w / 2 - 1]) {
      put('shell', u, 2.15, front + .3, .7, 4.3, .5, style.trim);
    }
    put('shell', 0, shopHeight + 1, front + .4, w + .65, 1.7, .55, style.awning);
    put('trim', 0, shopHeight + 1.4, front + .75, w - 2.5, .12, .14, style.accent);
    if (!modern) {
      put('shell', 0, shopHeight - .2, front + 1.05, w + .4, .18, 1.75, style.awning);
      for (let n = 0; n < 5; n++) {
        put('trim', -w * .36 + n * w * .18, shopHeight - .25, front + 1.55, w * .085, .24, .65,
          n % 2 ? '#e7d5ba' : style.accent);
      }
    } else {
      put('shell', 0, shopHeight + 2.15, front + .22, w - 1.8, .25, .28, style.accent);
    }

    // A family-specific roofline changes the silhouette from a generic box.
    if (market) {
      for (const u of [-w * .33, w * .33]) {
        put('shell', u, h + 1.15, front - .5, 1.1, 2.3, 1.1, style.trim);
      }
      put('shell', 0, h + .75, 0, w - 1.5, 1.25, depth - 1.8, '#825b4c');
      put('trim', 0, h + 1.55, front - .25, w - 1.2, .22, .5, style.accent);
    } else if (modern) {
      put('shell', 0, h + 1.7, -depth * .12, Math.max(5, w * .46), 2.8, depth * .45, style.trim);
      put('trim', 0, h + .85, front, w + .1, 1.05, .24, style.accent);
    } else {
      put('shell', 0, h + .8, 0, w + .1, 1.1, depth - 1.1, style.awning);
      put('trim', 0, h + 1.45, front - .3, w - 1.4, .2, .4, style.accent);
    }

    // Recessed upper floors, visible shutters, and balcony rails. Cap tiny
    // detail per facade so a dense city remains viable on mobile WebGL.
    const levels = Math.min(3, Math.max(1, Math.floor((h - shopHeight - 1.9) / floor)));
    for (let level = 0; level < levels; level++) {
      const y = shopHeight + 2.4 + level * floor;
      if (y + 1.4 > h - .5) break;
      for (let col = 0; col < (modern ? 3 : 2); col++) {
        const u = (col - (modern ? 1 : .5)) * (w / (modern ? 3.6 : 2.35));
        put('window', u, y, front + .2, modern ? 3.8 : 3.15, 2.7, .16,
          (i + level + col) % 5 === 0 ? '#f6bf80' : '#71949f');
        put('trim', u, y + 1.48, front + .29, modern ? 4.05 : 3.5, .28, .24, style.trim);
        // One high-contrast balcony run per selected heritage building
        // reads as layered architecture without ~10 railing meshes per shop.
        if (!modern && level === 0 && i % 3 === 0) {
          put('trim', u, y - 1.5, front + .66, 4.1, .24, 1.25, style.trim);
          for (const rail of [-1.7, 1.7]) put('trim', u + rail, y - .92, front + 1.18, .16, .8, .12, style.accent);
        }
      }
    }
    // Chinatown gets vertical projecting sign-cabinets; riverfront and heritage
    // quarters get staggered shaded balconies. These are intentionally original
    // decorative signs, not claims about authentic shop identities or text.
    if (market && i % 3 !== 0 && h > 10) {
      const u = (i % 2 ? -1 : 1) * (w * .38);
      put('shell', u, Math.min(h - 2, 8), front + 1.15, 1.25, 6.2, 1.1, style.awning);
      put('trim', u, Math.min(h - 2, 8), front + 1.76, .9, 4.9, .13, style.accent);
      put('trim', u, Math.min(h - 2, 8), front + 1.85, .14, 4.5, .09, '#f4e3bd');
    }
    if ((family === 'heritage' || family === 'riverside') && i % 4 === 0) {
      put('trim', 0, shopHeight + 3.25, front + 1, w * .68, .22, 1.7, style.awning);
    }
  });
  count.districts = [...visited].sort();
  return count;
}
