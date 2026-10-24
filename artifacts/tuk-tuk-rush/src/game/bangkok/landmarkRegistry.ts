import { BANG_RAK_PLAN } from "./bangRakPlan";
import { CHINATOWN_HERITAGE } from "./chinatownHeritage";
import { CITY_MODEL, canonicalFeaturePoint } from "./cityModel";
import type { District, Obstacle, Point } from "../types";
import { GEOGRAPHIC_REFERENCES } from "./geography";
import { REAL_PLACES } from "./realPlaces";
import {
  FACADE_APPROACHES,
  facadeFeature,
  landmarkParcels,
  localPoint,
} from "./landmarkParcels";
import { landmarkSightlines } from "./landmarkVisibility";
import { MRT_ENTRANCES } from "./masterPlan";
import { scalaParcel } from "./scala";
import { riverPiers } from "./riverfront";
const HUA_SOURCES = [
  "https://www.thailandtravel.or.jp/hua-lamphong-station/",
  "https://metro.bemplc.co.th/Line-Maps?Line=2&Station=28",
  "https://commons.wikimedia.org/wiki/File:Gare_Hua_Lamphong.jpg",
];
export type LandmarkRegistryEntry = {
  id: string;
  name: string;
  category: string;
  district: string;
  geographicReference?: { lat: number; lon: number };
  coordinateAccuracy: "approximate-site-center" | "not-verified";
  world: Point;
  /** Asset origin can differ from the named visible feature (Swing/Suthat). */
  modelOrigin?: Point;
  map: { x: number; y: number };
  rotation: number;
  footprints: Pick<Obstacle, "x" | "z" | "w" | "d" | "yaw" | "height">[];
  height?: number;
  facade?: ReturnType<typeof facadeFeature>;
  mainEntrance?: Point;
  vehicleAccess?: Point & { nodeId: string };
  pedestrianAccess?: Point;
  protectedParcels: string[];
  visibilityCorridors: string[];
  neighbors: string[];
  roadRelationships: string[];
  references: string[];
  confidence:
    | "photo-and-operator-checked"
    | "inherited-reference"
    | "unverified-this-pass";
  compression: string;
  visualQa:
    | "pending-render-review"
    | "street-and-elevated-reviewed"
    | "volume-audit-only";
};
/** Read model, never another placement table. Geometry and public stops are
 * derived from the SAME objects consumed by renderer, map and missions. */
export function buildLandmarkRegistry(d: District): LandmarkRegistryEntry[] {
  const lines = landmarkSightlines(d),
    parcels = landmarkParcels(d),
    nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const entries: LandmarkRegistryEntry[] = d.landmarks.map((l) => {
    const heritage = CHINATOWN_HERITAGE.find((h) => h.id === l.id);
    const geo =
        GEOGRAPHIC_REFERENCES.find((g) => g.id === l.id) ??
        (heritage
          ? {
              coordinate:
                l.id === "wat-mangkon"
                  ? { lat: 13.7434472167, lon: 100.5094355083 }
                  : { lat: 13.7312630903, lon: 100.5134549129 },
              district: "Samphanthawong / Talat Noi",
              corridors:
                l.id === "wat-mangkon" ? ["charoen_n"] : ["wanit-2-south"],
              sources: [heritage.source],
              neighbors: l.id === "holy-rosary" ? ["river-city"] : ["gate"],
              compromise:
                heritage.character +
                ". Original compressed model; protected grounds and street approach are approved game geometry.",
            }
          : undefined),
      real = REAL_PLACES.find((p) => p.id === l.id),
      site = d.authoredSites?.find((s) => s.id === l.id),
      arrival = d.destinations?.find((a) => a.landmarkId === l.id);
    const position = l.plot ?? l,
      solids = d.obstacles.filter((o) => o.landmarkId === l.id && !o.artRole),
      stop = nodes.get(l.accessNode!);
    const hua = l.id === "hua", bangRak = ["grand-postal", "warehouse-30"].includes(l.id!);

    const face = facadeFeature(l);
    const entrance = hua
      ? { x: position.x, z: position.z + 33 }
      : FACADE_APPROACHES[l.id!]?.road && face
        ? { x: face.x, z: face.z }
        : (site?.entrance ??
          (arrival
            ? { x: arrival.entrance.x, z: arrival.entrance.z }
            : undefined));
    return {
      id: l.id!,
      name: l.name,
      category: l.kind,
      district: bangRak ? "Bang Rak / Charoen Krung Creative District" : hua
        ? "Pathum Wan"
        : (geo?.district ??
          real?.neighborhood ??
          d.regions?.find((r) => r.id === real?.region)?.name ??
          "District requires verification"),
      geographicReference: hua
        ? { lat: 13.73922, lon: 100.5167605 }
        : geo?.coordinate,
      coordinateAccuracy:
        hua || geo ? "approximate-site-center" : "not-verified",
      world: canonicalFeaturePoint(l.id!, position, l.yaw ?? 0),
      modelOrigin: { ...position },
      map: {
        x: canonicalFeaturePoint(l.id!, position, l.yaw ?? 0).x / 4 + 500,
        y: canonicalFeaturePoint(l.id!, position, l.yaw ?? 0).z / 4 + 600,
      },
      rotation: l.yaw ?? 0,
      footprints: solids.map((o) => ({
        x: o.x,
        z: o.z,
        w: o.w,
        d: o.d,
        yaw: o.yaw ?? 0,
        height: o.height,
      })),
      height: solids.length
        ? Math.max(...solids.map((o) => o.height))
        : undefined,
      facade: facadeFeature(l),
      mainEntrance: bangRak ? (l.id === "grand-postal" ? {x:75.5,z:990} : {x:-65,z:917}) : entrance,
      vehicleAccess: stop
        ? { x: stop.x, z: stop.z, nodeId: stop.id }
        : undefined,
      pedestrianAccess: entrance,
      protectedParcels: parcels
        .filter((p) => p.landmarkId === l.id)
        .map((p) => p.id),
      visibilityCorridors: lines
        .filter((v) => v.landmarkId === l.id)
        .map((v) => v.id),
      neighbors: geo?.neighbors ?? real?.nearby ?? [],
      roadRelationships: hua
        ? [
            "Rama IV south approach",
            "Historic mainline station; BL28 underground",
            "Train shed and mainline yard extend north behind the south facade",
          ]
        : (geo?.corridors ?? (real ? [real.address] : [])),
      references: [
        ...new Set(
          hua
            ? HUA_SOURCES
            : bangRak ? [...BANG_RAK_PLAN.sources] : [...(geo?.sources ?? []), ...(real?.references ?? [])],
        ),
      ],
      confidence: hua
        ? "photo-and-operator-checked"
        : geo || real
          ? "inherited-reference"
          : "unverified-this-pass",
      compression: bangRak ? BANG_RAK_PLAN.compromises.join(" ") : hua
        ? "South-facing model; 84m-wide south facade retained from PR31; train shed extends north into a protected 90×300m mainline reservation. Tracks and yard are compressed, not surveyed geometry."
        : (geo?.compromise ??
          FACADE_APPROACHES[l.id!]?.note ??
          "Authored arcade dimensions. Exact footprint, bearing and neighboring parcels remain unverified."),
      visualQa: "pending-render-review",
    };
  });
  // A shared interchange is one place, with one entry and multiple represented
  // lines. Existing line/station keys remain intact for trains and old saves.
  for (const line of d.transit?.lines ?? [])
    for (const s of line.stations) {
      const id = `bts:${s.id}`,
        prior = entries.find((e) => e.id === id);
      if (prior) {
        prior.roadRelationships.push(`${line.name} (${s.code})`);
        continue;
      }
      entries.push({
        id,
        name: s.name,
        category: "bts-station",
        district: "Transit corridor",
        coordinateAccuracy: "not-verified",
        world: { x: s.x, z: s.z },
        map: { x: s.x / 4 + 500, y: s.z / 4 + 600 },
        rotation: s.yaw,
        footprints: [
          { x: s.x, z: s.z, w: 22, d: s.length, yaw: s.yaw, height: 26 },
        ],
        height: 26,
        mainEntrance: s.entrances?.[0],
        pedestrianAccess: s.entrances?.[0],
        protectedParcels: [],
        visibilityCorridors: [],
        neighbors: s.landmark ? [s.landmark] : [],
        roadRelationships: [`${line.name} (${s.code})`],
        references: ["https://www.bts.co.th/eng/routemap.html"],
        confidence: "inherited-reference",
        compression:
          "Station length, stairs and guideway are compressed; exact entrance survey remains pending.",
        visualQa: "pending-render-review",
      });
    }
  for (const s of MRT_ENTRANCES) {
    const o = d.obstacles.find((o) => o.environmentId === s.id);
    const fact = CITY_MODEL.infrastructure.mrt.find((m) => m.id === s.id);
    if (!o) continue;
    entries.push({
      id: s.id,
      name: `MRT ${s.name} (${s.code})`,
      category: "underground-mrt-entrance",
      district: s.district,
      geographicReference:
        fact && "coordinate" in fact ? fact.coordinate : undefined,
      coordinateAccuracy:
        fact && "coordinate" in fact
          ? "approximate-site-center"
          : "not-verified",
      world: { x: o.x, z: o.z },
      map: { x: o.x / 4 + 500, y: o.z / 4 + 600 },
      rotation: o.yaw ?? 0,
      footprints: [o],
      height: o.height,
      mainEntrance: { x: o.x, z: o.z },
      pedestrianAccess: { x: o.x, z: o.z },
      protectedParcels: [],
      visibilityCorridors: [],
      neighbors: s.interchange ? [`bts:${s.interchange}`] : [],
      roadRelationships: ["Surface entrance only; no elevated MRT guideway"],
      references: s.sources,
      confidence: "inherited-reference",
      compression:
        "Surface canopy placement, not a model of the underground station.",
      visualQa: "pending-render-review",
    });
  }
  // Named structures inside an existing compound are inventory sub-places,
  // never duplicate runtime landmarks, mission stops or discovery awards.
  for (const sub of [
    {
      id: "suthat",
      name: "Wat Suthat",
      owner: "swing",
      x: 0,
      z: 39,
      category: "temple",
    },
    {
      id: "erawan-shrine",
      name: "Erawan Shrine",
      owner: "erawan-hotel",
      x: -27,
      z: -18,
      category: "shrine",
    },
  ]) {
    const owner = entries.find((e) => e.id === sub.owner)!;
    const world = localPoint(
      owner.modelOrigin ?? owner.world,
      owner.rotation,
      sub.x,
      sub.z,
    );
    entries.push({
      ...owner,
      id: sub.id,
      name: sub.name,
      category: sub.category,
      world,
      map: { x: world.x / 4 + 500, y: world.z / 4 + 600 },
      geographicReference: undefined,
      coordinateAccuracy: "not-verified",
      footprints: [],
      height: undefined,
      facade: undefined,
      mainEntrance: undefined,
      pedestrianAccess: world,
      visibilityCorridors: [],
      neighbors: [sub.owner],
      compression: `Rendered inside ${owner.name}; existing compound geometry and access retained. Separate nominal pin has not been researched.`,
    });
  }
  const scala = scalaParcel(d),
    parent = entries.find((e) => e.id === "gate")!;
  entries.push({
    ...parent,
    id: "scala-yaowarat",
    name: "Scala Yaowarat",
    category: "historic-commercial-building",
    world: { x: scala.x, z: scala.z },
    map: { x: scala.x / 4 + 500, y: scala.z / 4 + 600 },
    rotation: scala.yaw ?? 0,
    footprints: [scala],
    height: scala.height,
    geographicReference: { lat: 13.7396439, lon: 100.5112985 },
    coordinateAccuracy: "approximate-site-center",
    facade: undefined,
    mainEntrance: undefined,
    vehicleAccess: undefined,
    pedestrianAccess: undefined,
    protectedParcels: [],
    visibilityCorridors: [],
    neighbors: ["gate"],
    references: [
      "https://www.openstreetmap.org/node/3096836172",
      "https://www.jtb.co.jp/kaigai_guide/asia/kingdom_of_thailand/BKK/124787/",
    ],
    confidence: "photo-and-operator-checked",
    compression:
      "Chinatown Scala restaurant at the Chaloem Buri corner on Yaowarat, not the former Siam cinema. Authored facade/sign interpretation fitted to an approved street-facing parcel; no claim of surveyed property dimensions.",
  });
  for (const pier of riverPiers(d)) {
    const fact = CITY_MODEL.infrastructure.piers.find((p) => p.id === pier.id);
    if (!fact) throw Error("Pier has no canonical metadata: " + pier.id);
    entries.push({
      id: `pier:${pier.id}`,
      name: pier.name,
      category: "river-pier",
      district: fact.district,
      world: { x: pier.x, z: pier.z },
      map: { x: pier.x / 4 + 500, y: pier.z / 4 + 600 },
      rotation: pier.yaw,
      geographicReference: fact.coordinate ?? undefined,
      coordinateAccuracy: fact.coordinate
        ? "approximate-site-center"
        : "not-verified",
      footprints: [],
      protectedParcels: [],
      visibilityCorridors: [],
      neighbors: [fact.owner],
      roadRelationships: [...fact.streets, `${fact.bank} bank of Chao Phraya`],
      references: fact.sources,
      confidence: fact.coordinate
        ? "inherited-reference"
        : "unverified-this-pass",
      compression:
        "Named landing context is pier-specific. Emitted position is fitted to the compressed river edge, not surveyed dock geometry.",
      visualQa: "pending-render-review",
    });
  }
  return entries;
}
