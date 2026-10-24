import * as T from "three";
import type { District, Landmark } from "../src/game/types";
import {
  ArchitecturalBatch,
  type ArtPiece,
} from "../src/game/bangkok/architecturalBatch";
import {
  emitBangRakGrounds,
  emitBangRakParcel,
} from "../src/game/bangkok/bangRakArt";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
/** Test adapter for landmarks rendered in the shared city batch. It consumes
 * the actual production emitters/templates, without creating duplicate hero
 * meshes or materials in the running game. */
export function batchedBangRakLandmark(l: Landmark, d: District) {
  if (!["grand-postal", "warehouse-30"].includes(l.id!)) return;
  const material = new T.MeshStandardMaterial({ vertexColors: true }),
    batch = new ArchitecturalBatch(material, material),
    origin = l.plot!,
    yaw = l.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const add = (p: ArtPiece) => {
    const dx = p.x - origin.x,
      dz = p.z - origin.z;
    batch.add({
      ...p,
      x: c * dx - s * dz,
      z: s * dx + c * dz,
      yaw: p.yaw - yaw,
    });
  };
  if (l.id === "grand-postal") emitBangRakGrounds(d, add);
  else
    for (const p of designBuildings(d).filter(
      (p) => p.parcel.landmarkId === l.id,
    ))
      emitBangRakParcel(p, add);
  const g = new T.Group();
  g.add(...batch.finish());
  return g;
}
