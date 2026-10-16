import { regionAt } from "./world";
import { environmentPeople, placementIndex } from "./environmentPlan";
import type { District, Point } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { designBuildings, type ParcelDesign } from "./buildingGrammar";
import { distanceToSegment, obstacleDistance } from "../world";
import type { StreetPerson } from "../streetLife";

/** All street furnishings sit within colliding plots; cables and canopy lights
 * are overhead. Sidewalk light pools have no collision and no real-time lights. */
export function emitUrbanLayers(
  d: District,
  designs: ParcelDesign[],
  emit: (o: ArtPiece) => void,
) {
  const put = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    shape: ArtPiece["shape"] = "box",
    layer: ArtPiece["layer"] = "core",
    yaw = 0,
  ) =>
    emit({
      x,
      y,
      z,
      w,
      h,
      d: depth,
      color,
      shape,
      layer,
      yaw,
      surface: "concrete",
    });
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  for (const [i, p] of designs.entries()) {
    if (p.parcel.artRole) continue;
    const b = p.parcel,
      yaw = b.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const threshold = {
      x: b.x + s * (b.d / 2 + 1.1),
      z: b.z + c * (b.d / 2 + 1.1),
    };
    put(
      threshold.x,
      0.14,
      threshold.z,
      b.w,
      0.16,
      2.4,
      "#bdb59f",
      "box",
      "core",
      yaw,
    );
    const local = (u: number, v: number) => ({
      x: b.x + c * u + s * v,
      z: b.z - s * u + c * v,
    });
    const modern = ["siam", "silom", "sukhumvit", "icon"].includes(p.region);
    if (i % 3 === 0 || p.region === "oldtown") {
      const q = local(b.w * 0.38, -b.d * 0.35);
      put(q.x, 1.8, q.z, 0.45, 3.6, 0.45, "#796647", "cylinder");
      put(q.x, 4.7, q.z, 5.2, 5, 4.7, modern ? "#588165" : "#617f50", "orb");
      put(q.x - 1, 6, q.z, 3.7, 3.7, 3.5, "#7a9c60", "orb");
    }
    if (
      p.hero &&
      ["chinatown", "talatnoi", "oldtown"].includes(p.region) &&
      i % 2 === 0
    ) {
      const q = local(-b.w * 0.44, b.d / 2 - 0.2);
      put(q.x, 3.4, q.z, 0.16, 6.8, 0.16, "#4c544e", "cylinder");
      const out = local(-b.w * 0.44, b.d / 2 + 0.7);
      put(out.x, 6.6, out.z, 0.65, 0.16, 1.9, "#5d655a", "box", "core", yaw);
      put(out.x, 6.48, out.z, 0.55, 0.13, 0.8, "#f1cb87", "box", "night", yaw);
      // Halo is an opaque emissive patch mounted under the lamp, inexpensive
      // and stable without alpha sorting/bloom or a per-object point light.
    }
    if (
      ["chinatown", "talatnoi", "khaosan"].includes(p.region) &&
      i % 2 === 0
    ) {
      const q = local(0, b.d / 2 + 0.13);
      put(q.x, 5.75, q.z, b.w, 0.075, 0.09, "#3b4545", "box", "core", yaw);
      put(q.x, 5.9, q.z, b.w, 0.04, 0.09, "#394747", "box", "detail", yaw);
      // Each parcel gets a cable return down the exposed corner, not a cable
      // stretched through an intersection to an unrelated building.
      const end = local(b.w * 0.44, b.d / 2 + 0.13);
      put(end.x, 4.65, end.z, 0.075, 2.6, 0.075, "#414842", "box", "detail");
    }
    if (p.region === "oldtown" && i % 4 === 0) {
      const q = local(0, b.d / 2 - 0.6);
      put(q.x, 0.7, q.z, b.w, 1.4, 0.45, "#e8d8b5", "box", "core", yaw);
      for (const side of [-1, 1]) {
        const cap = local(side * b.w * 0.44, b.d / 2 - 0.6);
        put(cap.x, 1.6, cap.z, 0.65, 2.9, 0.65, "#d6c59d", "box");
      }
    }
  }
  // Continuous silhouette behind roadside development uses only real parcels.
  // World fog covers the finite city boundary; there are no floating aerial slabs.
}

/** Regional queues and walkers seeded beside busy frontages. Citywide population
 * is bounded; the shared renderer submits at most 32 nearby people (Fast:20). */
export function bangkokPeople(
  d: District,
  designs = designBuildings(d),
): StreetPerson[] {
  const clear = placementIndex(d).person;
  const people: StreetPerson[] = [];
  for (const p of [...designs].sort(
    (a, b) =>
      Number(b.corridor === "khaosan") - Number(a.corridor === "khaosan"),
  )) {
    if (
      (!p.hero && p.region !== "khaosan") ||
      p.parcel.artRole ||
      p.bays.every((a) => !a.occupied)
    )
      continue;
    const quota = ["chinatown", "khaosan"].includes(p.region)
      ? 96
      : p.region === "talatnoi"
        ? 64
        : 48;
    if (
      people.filter(
        (person) =>
          (person as StreetPerson & { region?: string }).region === p.region,
      ).length >= quota
    )
      continue;
    if (!["chinatown", "khaosan"].includes(p.region) && p.parcel.x % 3 > 1)
      continue;
    const b = p.parcel,
      yaw = b.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw),
      dist = b.d / 2 + 1.95;
    for (const off of ["chinatown", "khaosan"].includes(p.region)
      ? [-0.28, 0.22]
      : [0.1]) {
      const u = b.w * off,
        start = { x: b.x + c * u + s * dist, z: b.z - s * u + c * dist },
        end = { x: start.x + c * 1.7, z: start.z - s * 1.7 };
      if (!clear(start) || !clear(end)) continue;
      const seed = people.length,
        role: StreetPerson["role"] =
          seed % 5 === 0 ? "vendor" : seed % 3 === 0 ? "customer" : "walker";
      people.push(
        Object.assign(
          {
            start,
            end: role === "walker" ? end : start,
            ...start,
            heading: yaw + Math.PI,
            seed,
            height: 0.95 + (seed % 5) * 0.025,
            role,
          },
          { region: p.region },
        ),
      );
    }
  }
  const groups = new Map<string, StreetPerson[]>();
  for (const p of [...environmentPeople(d), ...people]) {
    const id = regionAt(d, p.start)?.id ?? "connector";
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(p);
  }
  const balanced: StreetPerson[] = [];
  for (let i = 0; balanced.length < 360; i++) {
    let found = false;
    for (const group of groups.values())
      if (group[i] && balanced.length < 360) {
        balanced.push(group[i]!);
        found = true;
      }
    if (!found) break;
  }
  return balanced;
}
