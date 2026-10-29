import * as T from "three";
import type { RoadPolygons } from "../roadSurfaceGraph";
import type { Obstacle } from "../../types";
export type BuildingEdge = {
  polygon: number; ring: number; edge: number;
  a: [number, number]; b: [number, number];
  street: string | null; collision: boolean;
};
/** Authoritative offline source contract. Complete source rings remain in the
 * committed source archive; compiled runtime records retain all edge/facade
 * metadata and identify that archive by chunk and stable source ID. */
export type GeographicBuilding = {
  id: string; sourceVersion: number; parentId?: string;
  tags: Record<string, string>; polygons: RoadPolygons; sourceFootprint: RoadPolygons;
  edges: BuildingEdge[]; orientation: number; neighborhood: string;
  roofRenderedAs: string; seed: number; family: string; classification: string;
  height: number; minHeight: number; floors: number; heightBasis: string;
  roof: string; roofHeight: number; roofBasis: string; material: string;
  confidence: string; provenance: "osm-footprint"; inferred: false;
};
export type RuntimeBuilding = Omit<GeographicBuilding, "polygons" | "sourceFootprint">;
export const buildingFogFar = (quality: "low" | "medium") => quality === "low" ? 950 : 1350;
const lodPosition = new T.Vector3();
export function updateBuildingLOD(root: T.Group, camera: T.Vector3, quality: "low" | "medium", forward?: T.Vector3) {
  root.traverse(o => {
    if (o instanceof T.Mesh && o.userData.detail) {
      const p = o.getWorldPosition(lodPosition), cell = o.userData.cell as number[];
      o.visible = Math.hypot(camera.x - p.x - cell[0]!, camera.z - p.z - cell[1]!) < (quality === "low" ? 110 : 210);
    } else if (o instanceof T.Mesh && o.name === "BuildingMassing" && forward) {
      const sphere = o.geometry.boundingSphere!, p = o.getWorldPosition(lodPosition).add(sphere.center).sub(camera);
      o.visible = p.dot(forward) - sphere.radius <= buildingFogFar(quality);
    }
  });
}
/** Thin oriented wall segments preserve courtyards and narrow passages. Source
 * uncertainty is classified offline, not silently resolved by moving footprints. */
export function buildingObstacles(items: Pick<RuntimeBuilding, "id" | "height" | "edges">[], origin: number[]): Obstacle[] {
  return items.flatMap(b => b.edges.filter(e => e.collision).map(e => ({
    x: origin[0]! + (e.a[0] + e.b[0]) / 2,
    z: origin[1]! + (e.a[1] + e.b[1]) / 2, w: .12,
    d: Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]),
    height: b.height, color: "#bca", yaw: Math.atan2(e.b[0] - e.a[0], e.b[1] - e.a[1]), sourceId: b.id,
  })));
}
