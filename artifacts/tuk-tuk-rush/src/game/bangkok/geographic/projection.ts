/** Permanent WGS84 / UTM47N frame; legacy geography.ts remains compressed.
 * Snyder transverse Mercator series, WGS84 ellipsoid, k0=.9996, meridian 99°.
 * Persistent identity is lon/lat. X east, Z south, one unit per meter.
 */
export type Geographic = { lon: number; lat: number };
export type World = { x: number; z: number };
export const GEOGRAPHIC_FRAME = Object.freeze({
  crs: "EPSG:32647",
  easting: 660000,
  northing: 1520000,
  chunkSize: 1024,
});
const a = 6378137,
  e2 = 0.0066943799901413165,
  ep2 = e2 / (1 - e2),
  k = 0.9996,
  rad = Math.PI / 180;
function finite(...v: number[]) {
  if (!v.every(Number.isFinite))
    throw new RangeError("Coordinates must be finite");
}
export function geographicToMeters({ lon, lat }: Geographic): World {
  finite(lon, lat);
  if (lon < 96 || lon > 102 || lat < 0 || lat > 84)
    throw new RangeError("Outside UTM47N frame");
  const p = lat * rad,
    s = Math.sin(p),
    c = Math.cos(p),
    t = Math.tan(p) ** 2,
    C = ep2 * c * c,
    A = c * (lon - 99) * rad,
    N = a / Math.sqrt(1 - e2 * s * s);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) *
        Math.sin(2 * p) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const E =
    500000 +
    k *
      N *
      (A +
        ((1 - t + C) * A ** 3) / 6 +
        ((5 - 18 * t + t * t + 72 * C - 58 * ep2) * A ** 5) / 120);
  const north =
    k *
    (M +
      N *
        Math.tan(p) *
        ((A * A) / 2 +
          ((5 - t + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * C - 330 * ep2) * A ** 6) / 720));
  return {
    x: E - GEOGRAPHIC_FRAME.easting,
    z: GEOGRAPHIC_FRAME.northing - north,
  };
}
export function metersToGeographic({ x, z }: World): Geographic {
  finite(x, z);
  const mu =
      (GEOGRAPHIC_FRAME.northing - z) /
      k /
      (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256)),
    e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(p),
    c = Math.cos(p),
    t = Math.tan(p) ** 2,
    C = ep2 * c * c,
    N = a / Math.sqrt(1 - e2 * s * s),
    R = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5,
    D = (x + GEOGRAPHIC_FRAME.easting - 500000) / (N * k);
  const lat =
    p -
    ((N * Math.tan(p)) / R) *
      ((D * D) / 2 -
        ((5 + 3 * t + 10 * C - 4 * C * C - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * t + 298 * C + 45 * t * t - 252 * ep2 - 3 * C * C) *
          D ** 6) /
          720);
  const lon =
    99 * rad +
    (D -
      ((1 + 2 * t + C) * D ** 3) / 6 +
      ((5 - 2 * C + 28 * t - 3 * C * C + 8 * ep2 + 24 * t * t) * D ** 5) /
        120) /
      c;
  return { lon: lon / rad, lat: lat / rad };
}
export function geographicChunk(p: World) {
  finite(p.x, p.z);
  const size = GEOGRAPHIC_FRAME.chunkSize,
    x = Math.floor(p.x / size) * size,
    z = Math.floor(p.z / size) * size;
  return {
    id: `${x}:${z}`,
    origin: { x, z },
    local: { x: p.x - x, z: p.z - z },
  };
}
