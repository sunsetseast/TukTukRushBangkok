import type { ChunkReference } from "./streaming";
import type { District, Road } from "../../types";
import type { RoadPolygons } from "../roadSurfaceGraph";
import { geographicToMeters } from "./projection";
import { inRiverWater } from "../waterGeometry";
import { compiledChunkFile, decodeCompiledChunk, type CompiledBuildings } from "./compiledBuildings";
export type GeographicWay = {
  id: string;
  nodes: string[];
  tags: Record<string, string>;
  coverage: "A" | "B" | "C";
  heights: number[];
  profiles?: [number, number, number][][];
  heightBasis: string;
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
  chunks: ChunkReference[];
  rail: GeographicRail;
  coverageAnchors: { id: string; lon: number; lat: number }[];
  bounds: NonNullable<District["bounds"]>;
};
export type RailTrack = {
  id: string;
  tags: Record<string, string>;
  points: [number, number][];
  lines: string[];
  status: string;
  level: string;
  height: number;
  playable: boolean;
};
export type GeographicStation = {
  id: string;
  tags: Record<string, string>;
  point: [number, number];
  coordinate: [number, number];
  lines: string[];
  level: string;
  height: number;
  yaw: number;
  status: string;
  playable: boolean;
};
export type GeographicRail = {
  catalog: { lines: { id: string; name: string; color: string }[] };
  tracks: RailTrack[];
  stations: GeographicStation[];
  routes: {
    id: string;
    lines: string[];
    status: string;
    members: { id: string; role: string }[];
  }[];
  interchanges: { id: string; members: { id: string; role: string }[] }[];
};
export type GeographicChunkData = {
  timing?: {
    fetchHeadersMs: number;
    decodeAndBodyMs: number;
    jsonParseMs: number;
    geometryDecodeMs?: number;
    compressedBytes?: number;
    decodedBytes?: number;
  };
  buildings?: import("./buildings").RuntimeBuilding[];
  buildingGeometry?: CompiledBuildings;
  sourceChunk?: string;
  origin: [number, number];
  land: RoadPolygons;
  water: RoadPolygons;
  roads: RoadPolygons;
  bridges: RoadPolygons;
  decks: { id: string; points: [number, number, number][]; width: number }[];
  rail: {
    id: string;
    points: [number, number][];
    height: number;
    level: string;
    line: string;
  }[];
  stations: GeographicStation[];
  supports?: { point: [number, number]; height: number; line: string }[];
};
export async function loadGeographicChunk(
  ref: ChunkReference,
  signal?: AbortSignal,
) {
  const started = performance.now();
  const timing = { fetchHeadersMs: 0, decodeAndBodyMs: 0, jsonParseMs: 0 };
  const response = await fetch(`${import.meta.env.BASE_URL}assets/geography/${compiledChunkFile(ref)}`, { signal });
  if (!response.ok || !response.body) throw Error(`Compiled geographic asset unavailable (${response.status}); run geography:compile`);
  const headersAt = performance.now();
  const decoded = response.headers.get("content-encoding") === "gzip" ? response :
    new Response(response.body.pipeThrough(new DecompressionStream("gzip")));
  const raw = await decoded.arrayBuffer(), decodeAt = performance.now();
  const chunk = decodeCompiledChunk(raw, ref);
  chunk.timing = { ...timing, ...chunk.timing, fetchHeadersMs: headersAt - started,
    decodeAndBodyMs: decodeAt - headersAt,
    compressedBytes: Number(response.headers.get("content-length") ?? 0), decodedBytes: raw.byteLength };
  return chunk;
}
async function loadGzip(
  url: string,
  signal?: AbortSignal,
  timing?: {
    fetchHeadersMs: number;
    decodeAndBodyMs: number;
    jsonParseMs: number;
  },
) {
  const started = performance.now();
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body)
    throw Error(`Geographic asset unavailable (${response.status}): ${url}`);
  const headersAt = performance.now();
  const decoded =
    response.headers.get("content-encoding") === "gzip"
      ? response
      : new Response(
          response.body.pipeThrough(new DecompressionStream("gzip")),
        );
  const body = await decoded.text();
  const parseStart = performance.now();
  const result = JSON.parse(body);
  if (timing) {
    timing.fetchHeadersMs = headersAt - started;
    timing.decodeAndBodyMs = parseStart - headersAt;
    timing.jsonParseMs = performance.now() - parseStart;
  }
  return result;
}
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
  return validateDataset(
    (await loadGzip(
      `${import.meta.env.BASE_URL}assets/geography/runtime.v1.json.gz`,
    )) as GeographicDataset,
  );
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
      (mode !== "pedestrian" &&
        (r.tunnel || r.tags.area === "yes" || r.tags.highway === "steps")) ||
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
      const identity = (n: number) =>
        Math.abs(r.heights[n] ?? 0) > 1
          ? `${r.nodes[n]}@${Math.round(r.heights[n]!)}`
          : r.nodes[n]!;
      const a = identity(i - 1),
        b = identity(i),
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
    .filter(
      (r) =>
        !r.tunnel &&
        r.tags.highway !== "steps" &&
        r.tags.area !== "yes" &&
        r.vehicleClearance,
    )
    .flatMap((r) =>
      r.nodes.slice(1).map((b, i) => ({
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
