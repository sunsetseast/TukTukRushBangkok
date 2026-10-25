import type { District, Road } from "../../types";
import type { RoadPolygons } from "../roadSurfaceGraph";
import { geographicToMeters } from "./projection";
import { inRiverWater } from "../waterGeometry";
export type GeographicWay = {
  id: string;
  nodes: string[];
  tags: Record<string, string>;
  coverage: "A" | "B";
  width: number;
  widthBasis: "tagged" | "osm-estimate" | "class-estimate";
  vehicleClearance: boolean;
  pedestrianClearance: boolean;
  bridge: boolean;
  tunnel: boolean;
};
export type GeographicDataset = {
  schema: 1;
  crs: string;
  origin: number[];
  bbox: number[];
  snapshotSha256: string;
  nodes: Record<string, [number, number]>;
  roads: GeographicWay[];
  references: { id: string; coverage: "A" | "B" | "C" }[];
  waterUnion: RoadPolygons;
  water: { id: string; tags: Record<string, string>; polygons: RoadPolygons }[];
  boundaries: {
    id: string;
    tags: Record<string, string>;
    geometry: { type: string; coordinates: number[][][][] };
  }[];
  featuredBoundary: { type: string; coordinates: number[][][] };
  chunks: ({ origin: [number, number] } & Record<
    "land" | "water" | "roads" | "bridges",
    RoadPolygons
  >)[];
  bounds: NonNullable<District["bounds"]>;
};
export function validateDataset(data: GeographicDataset) {
  if (
    data.schema !== 1 ||
    data.crs !== "EPSG:32647" ||
    data.origin[0] !== 660000 ||
    data.origin[1] !== 1520000
  )
    throw Error("Unknown geographic frame");
  for (const r of data.roads)
    if (r.nodes.some((id) => !data.nodes[id]))
      throw Error("Incomplete geographic way: " + r.id);
  return data;
}
export async function loadGeographicDataset() {
  const response = await fetch(
    `${import.meta.env.BASE_URL}assets/geography/runtime.v1.json.gz`,
  );
  if (!response.ok)
    throw Error(`Geographic dataset unavailable (${response.status})`);
  if (!response.body) throw Error("Empty geographic dataset");
  // Vite/servers may advertise gzip and browsers decode that automatically. Static
  // hosts serving raw .gz bytes need the explicit stream decoder.
  const decoded =
    response.headers.get("content-encoding") === "gzip"
      ? response
      : new Response(
          response.body.pipeThrough(new DecompressionStream("gzip")),
        );
  return validateDataset((await decoded.json()) as GeographicDataset);
}
/** OSM node topology, never geometric welding of grade-separated crossings.
 * Access and one-way tags only constrain AI. Player and walking graphs use clearance.
 */
export function geographicGraph(
  data: GeographicDataset,
  mode: "player" | "pedestrian" | "traffic",
) {
  const graph = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    graph.get(a)!.add(b);
  };
  for (const r of data.roads) {
    if (
      r.tunnel ||
      (mode !== "pedestrian" && r.tags.highway === "steps") ||
      (mode === "pedestrian" ? !r.pedestrianClearance : !r.vehicleClearance)
    )
      continue;
    if (
      mode === "traffic" &&
      (["no", "private"].includes(
        r.tags.motorcar ?? r.tags.motor_vehicle ?? r.tags.access ?? "",
      ) ||
        ["path", "footway", "pedestrian", "cycleway"].includes(r.tags.highway!))
    )
      continue;
    for (let i = 1; i < r.nodes.length; i++) {
      const a = r.nodes[i - 1]!,
        b = r.nodes[i]!,
        oneway =
          r.tags.oneway ?? (r.tags.junction === "roundabout" ? "yes" : "no");
      if (mode !== "traffic" || oneway !== "-1") add(a, b);
      if (mode !== "traffic" || !["yes", "1", "true"].includes(oneway))
        add(b, a);
    }
  }
  return graph;
}
export function createGeographicDistrict(data: GeographicDataset): District {
  validateDataset(data);
  const nodes = Object.entries(data.nodes).map(([id, [x, z]]) => ({
    id,
    x,
    z,
  }));
  const roads: Road[] = data.roads
    .filter((r) => !r.tunnel && r.tags.highway !== "steps")
    .flatMap((r) =>
      r.nodes
        .slice(1)
        .map((b, i) => ({
          a: r.tags.oneway === "-1" ? b : r.nodes[i]!,
          b: r.tags.oneway === "-1" ? r.nodes[i]! : b,
          width: r.width,
          name:
            r.tags["name:en"] ??
            r.tags.name ??
            r.tags.highway ??
            "Unnamed passage",
          bridge: r.bridge,
          oneWay: ["yes", "1", "true", "-1"].includes(r.tags.oneway ?? ""),
          noTraffic: true,
          corridor: r.id,
        })),
    );
  const waterPolygons = data.waterUnion.map((p) =>
    p.map((r) => r.map(([x, z]) => ({ x, z }))),
  );
  const district: District = {
    nodes,
    roads,
    buildings: [],
    obstacles: [],
    landmarks: [],
    bounds: data.bounds,
    river: [],
    riverPolygon: waterPolygons.flat(),
    waterPolygons,
    waterVersion: `real-scale:${data.snapshotSha256}`,
  };
  const preferred = geographicToMeters({ lon: 100.5109, lat: 13.7393 });
  let best = Infinity;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const road of roads.filter((r) => /Yaowarat/i.test(r.name))) {
    const a = byId.get(road.a)!,
      b = byId.get(road.b)!,
      p = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      dist = Math.hypot(p.x - preferred.x, p.z - preferred.z);
    if (dist < best && !inRiverWater(district, p)) {
      best = dist;
      district.spawn = { ...p, heading: Math.atan2(b.x - a.x, b.z - a.z) };
    }
  }
  if (!district.spawn) throw Error("No dry Yaowarat spawn");
  return district;
}
