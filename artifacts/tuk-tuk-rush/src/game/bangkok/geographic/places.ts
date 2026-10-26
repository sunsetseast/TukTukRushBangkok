import type { District, Landmark, RoadNode } from "../../types";
import cityData from "../cityData.v1.json";
import { geographicToMeters } from "./projection";
import type { GeographicNetwork } from "./network";
/** Explicit WGS84 site anchors from the existing source register. Artwork has a
 * separate local scale/orientation contract; compressed coordinates are never read. */
export const MIGRATED_PLACES = [
  { id: "gate", kind: "gate", yaw: 0, maxRadius: 14 },
  { id: "traimit", kind: "temple", yaw: 0, maxRadius: 30 },
  { id: "river-city", kind: "mall", yaw: -Math.PI / 2, maxRadius: 32 },
  { id: "icon", kind: "mall", yaw: 0, maxRadius: 45 },
] as const;
export type GeographicPlace = {
  landmark: Landmark;
  stop: RoadNode;
  radius: number;
  sources: string[];
  coordinate: { lon: number; lat: number };
  accessWay: string;
  accuracy: string;
};
export function geographicPlaces(
  network: GeographicNetwork,
): GeographicPlace[] {
  const places: GeographicPlace[] = [];
  for (const spec of MIGRATED_PLACES) {
    const ref = cityData.geographicReferences.find((r) => r.id === spec.id)!;
    if (!ref.coordinate) throw Error(`Missing geographic anchor: ${spec.id}`);
    const coordinate =
      spec.id === "gate"
        ? { lon: 100.5129798, lat: 13.7371754 }
        : ref.coordinate;
    const p = geographicToMeters(coordinate),
      physical = network.nearest(p, 0),
      road = places.length ? network.access(p, places[0]!.stop) : physical,
      a = network.node(network.a[road.edge]!),
      b = network.node(network.b[road.edge]!);
    const stop =
      Math.hypot(p.x - a.x, p.z - a.z) < Math.hypot(p.x - b.x, p.z - b.z)
        ? a
        : b;
    if (!network.surface(stop, 0) || network.blocked(stop, stop))
      throw Error(`Unavailable geographic approach: ${spec.id}`);
    const radius = Math.min(
      spec.maxRadius,
      physical.distance - network.width[physical.edge]! / 2 - 1,
    );
    if (radius < 1) throw Error(`Anchor intersects a road: ${spec.id}`);
    places.push({
      landmark: {
        ...p,
        id: spec.id,
        name: ref.name,
        kind: spec.kind,
        yaw: spec.yaw,
        accessNode: stop.id,
      },
      stop: { ...stop, name: `${ref.name} · ${road.name}` },
      radius,
      sources:
        spec.id === "gate"
          ? ["https://www.openstreetmap.org/way/342812020"]
          : ref.sources,
      coordinate,
      accessWay: network.metadata.ways[network.way[road.edge]!]!.id,
      accuracy: ref.coordinateAccuracy ?? "approximate-site-center",
    });
  }
  return places;
}
export function createGameplayDistrict(network: GeographicNetwork) {
  const places = geographicPlaces(network);
  network.stops = places.map((p) => p.stop);
  // Use a verified real passenger approach as the initial driving location.
  const start = network.stops[0]!,
    road = network.nearest(start, 0);
  const district: District = {
    navigation: network,
    driving: network,
    nodes: network.stops,
    roads: [],
    buildings: [],
    obstacles: [],
    landmarks: places.map((p) => p.landmark),
    bounds: network.metadata.bounds,
    spawn: { ...start, heading: road.heading },
  };
  network.reset(start);
  return { district, places };
}
