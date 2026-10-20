import cityData from './cityData.v1.json';
/** Canonical research coordinates and explicit arcade compression.
 * Geographic observations derived from © OpenStreetMap contributors, ODbL 1.0:
 * https://www.openstreetmap.org/copyright . See QA reference snapshot provenance.
 * Nominal site centers are not surveyed entrances; do not route GPS users with them.
 */
export type GeographicCoordinate = { lat: number; lon: number };
export type DesignCoordinate = { x: number; y: number };
export type GeographicReference = {
  id: string;
  name: string;
  coordinate: GeographicCoordinate;
  coordinateAccuracy: "approximate-site-center";
  district: string;
  neighborhood: string;
  bank: "east" | "west";
  corridors: string[];
  frontage: string;
  neighbors: string[];
  publicAccess: string;
  design: readonly [number, number];
  sources: string[];
  compromise?: string;
};
export const GEOGRAPHIC_SOURCES = {
  osm: "https://www.openstreetmap.org/copyright",
  lumphini: "https://greener.bangkok.go.th/park/suan-lumpini/",
  lumphiniParking:
    "https://webportal.bangkok.go.th/environmentbma/page/sub/6671/-/0/info/538966",
  victory: "https://revolutionaryobjects.org/en/object/victory-monument",
  sanam:
    "https://www.tatnews.org/2025/04/tat-announces-kawsholiday-thailand-at-sanam-luang/",
  palace: "https://www.royalgrandpalace.th/en/home",
  suthat:
    "https://www.tourismthailand.org/Attraction/wat-suthatthepwararam-ratchaworamahawihan",
  flowers:
    "https://www.tourismthailand.org/Attraction/pak-khlong-talat-night-market",
  flowerHistory:
    "https://webportal.bangkok.go.th/upload/user/00000086/Innovation/PAK%20KLONG%20MARKET.pdf",
  jim: "https://jimthompsonhouse.org/visitor-information/",
  jimCompound:
    "https://artsandculture.google.com/story/the-jim-thompson-house-museum-the-james-h-w-thompson-foundation/pwWxmFjSajOYKg",
  mbk: "https://mbk-center.co.th/en/",
  discovery: "https://www.nendo.jp/en/works/siam-discovery/",
  center: "https://www.siamcenter.co.th/",
  paragon: "https://www.siamparagon.co.th/about",
  central: "https://www.centralworld.co.th/en",
  terminal: "https://www.terminal21.co.th/asok/contactus/th",
  riverCity: "https://rivercitybangkok.com/plan-your-visit/",
  oneBangkok: "https://www.onebangkok.com/en/location/",
  dusit: "https://www.dusit.com/dusitthani-bangkok/",
  okura: "https://www.okurabangkok.com/contact-location",
} as const;
// Legacy public API adapts versioned facts. The canonical JSON now owns source
// coordinates and approved design references; no site silently retunes the projection.
export const GEOGRAPHIC_REFERENCES = cityData.geographicReferences as unknown as GeographicReference[];

/** Strict monotonic knots produce an invertible piecewise-affine overview.
 * They do not fit every site. Authored positions are deliberate local overrides,
 * stored separately in each reference and exposed through geographicOffset(). */
export const LONGITUDE_KNOTS: readonly (readonly [number,number])[] = cityData.compression.longitudeKnots as [number,number][];
export const SOUTHING_KNOTS: readonly (readonly [number,number])[] = cityData.compression.southingKnots as [number,number][];
function piecewise(
  value: number,
  knots: readonly (readonly [number, number])[],
  inverse = false,
) {
  if (!Number.isFinite(value))
    throw new RangeError("Geographic coordinates must be finite");
  const a = inverse ? 1 : 0,
    b = inverse ? 0 : 1;
  let i = 0;
  while (i < knots.length - 2 && value > knots[i + 1]![a]) i++;
  const p = knots[i]!,
    q = knots[i + 1]!;
  return p[b] + ((value - p[a]) * (q[b] - p[b])) / (q[a] - p[a]);
}
export function geographicToDesign({
  lat,
  lon,
}: GeographicCoordinate): DesignCoordinate {
  return {
    x: piecewise(lon, LONGITUDE_KNOTS),
    y: piecewise(-lat, SOUTHING_KNOTS),
  };
}
export function designToGeographic({
  x,
  y,
}: DesignCoordinate): GeographicCoordinate {
  return {
    lat: -piecewise(y, SOUTHING_KNOTS, true),
    lon: piecewise(x, LONGITUDE_KNOTS, true),
  };
}
export function geographicToWorld(coordinate: GeographicCoordinate) {
  const p = geographicToDesign(coordinate);
  return { x: (p.x - 500) * 4, z: (p.y - 600) * 4 };
}
export function worldToGeographic({ x, z }: { x: number; z: number }) {
  return designToGeographic({ x: x / 4 + 500, y: z / 4 + 600 });
}
export const geographicReference = (id: string) =>
  GEOGRAPHIC_REFERENCES.find((p) => p.id === id);
export function geographicOffset(reference: GeographicReference) {
  const projected = geographicToDesign(reference.coordinate);
  return {
    x: reference.design[0] - projected.x,
    y: reference.design[1] - projected.y,
  };
}
