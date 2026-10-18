import * as T from "three";
import type { District, Obstacle, Point, Road } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { stableHash, buildingIdentity } from "./buildingGrammar";
import { regionAt } from "./world";
import { distanceToSegment } from "../world";
import { StaticBatch } from "../staticBatch";
import {
  CONVENIENCE_BRAND as B,
  createStoreBrandAtlas,
  storeBrandTile,
} from "./storeBrand";
import { placementIndex } from "./environmentPlan";

export type StoreVariant =
  | "narrow"
  | "corner"
  | "tower"
  | "standalone"
  | "transit";
export type ConvenienceStore = {
  id: string;
  brand: typeof B.id;
  name: string;
  region: string;
  variant: StoreVariant;
  parcel: Obstacle;
  road: Road;
  front: Point;
  yaw: number;
  width: number;
  entrance: Point;
  publicStop: Point;
  nearestNode: string;
  source: "representative-compressed-storefront";
  forecourt: { kind: "bin" | "motorcycle"; body: Obstacle }[];
  services: readonly ["water", "refreshments", "snacks"];
  interaction: { enabled: false; radius: number; futureEnergy: true };
};
const planned = new WeakMap<District, ConvenienceStore[]>();
const QUOTAS: Record<string, number> = {
  chinatown: 4,
  siam: 4,
  sukhumvit: 3,
  silom: 4,
  khaosan: 2,
  talatnoi: 2,
  icon: 2,
  north: 3,
  oldtown: 2,
  westbank: 3,
  south: 2,
  paknam: 1,
  connector: 3,
};

/** Convert existing physical street-facing generic premises; never reserve a
 * famous building or add another freestanding block just to carry a sign.
 * Store positions are representative compressed neighborhood locations, NOT
 * invented claims about the coordinates/branch codes of real businesses. */
export function planConvenienceStores(d: District) {
  const prior = planned.get(d);
  if (prior) return prior;
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const roads = d.roads
    .filter(
      (r) =>
        !r.destinationId &&
        !r.bridge &&
        !r.roundabout &&
        !r.shortcut &&
        !r.noTraffic,
    )
    .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }));
  const roadCells = new Map<string, typeof roads>();
  for (const road of roads)
    for (
      let x = Math.floor((Math.min(road.a.x, road.b.x) - 36) / 80);
      x <= Math.floor((Math.max(road.a.x, road.b.x) + 36) / 80);
      x++
    )
      for (
        let z = Math.floor((Math.min(road.a.z, road.b.z) - 36) / 80);
        z <= Math.floor((Math.max(road.a.z, road.b.z) + 36) / 80);
        z++
      ) {
        const key = `${x}:${z}`;
        if (!roadCells.has(key)) roadCells.set(key, []);
        roadCells.get(key)!.push(road);
      }
  const stations = d.transit?.lines.flatMap((l) => l.stations) ?? [];
  const candidates = d.buildings
    .filter(
      (b) =>
        !b.landmarkId && !b.protected && b.w >= 7 && b.d >= 7 && b.height >= 6,
    )
    .flatMap((b) => {
      const yaw = b.yaw ?? 0,
        nx = Math.sin(yaw),
        nz = Math.cos(yaw);
      const front = { x: b.x + (nx * b.d) / 2, z: b.z + (nz * b.d) / 2 };
      const nearby =
        roadCells.get(
          `${Math.floor(front.x / 80)}:${Math.floor(front.z / 80)}`,
        ) ?? [];
      const near = nearby
        .map((s) => ({ ...s, hit: distanceToSegment(front, s.a, s.b) }))
        .filter(
          (s) =>
            s.hit.distance < 24 &&
            s.hit.distance > s.r.width / 2 + 1.4 &&
            ((s.hit.point.x - front.x) * nx + (s.hit.point.z - front.z) * nz) /
              s.hit.distance >
              0.82,
        )
        .sort((a, z) => a.hit.distance - z.hit.distance)[0];
      if (!near) return [];
      const region = b.regionId ?? regionAt(d, b)?.id ?? "connector";
      const transit = stations.some(
        (s) => Math.hypot(s.x - b.x, s.z - b.z) < 95,
      );
      return [
        {
          b,
          yaw,
          front,
          near,
          region,
          transit,
          seed: stableHash(`7-eleven:${buildingIdentity(b)}`),
        },
      ];
    })
    .sort((a, b) => a.seed - b.seed);
  const stores: ConvenienceStore[] = [],
    counts = new Map<string, number>();
  for (const c of candidates) {
    const count = counts.get(c.region) ?? 0;
    if (
      count >= (QUOTAS[c.region] ?? 1) ||
      stores.some(
        (s) => Math.hypot(s.parcel.x - c.b.x, s.parcel.z - c.b.z) < 220,
      )
    )
      continue;
    const variant: StoreVariant = c.transit
      ? "transit"
      : c.b.height > 29
        ? "tower"
        : c.b.w < 12
          ? "narrow"
          : count % 3 === 0
            ? "corner"
            : "standalone";
    const width = Math.min(
      c.b.w - 0.6,
      variant === "narrow" ? 7.6 : variant === "tower" ? 12.8 : 11.4,
    );
    const entrance = {
      x: c.front.x + Math.sin(c.yaw) * 0.25,
      z: c.front.z + Math.cos(c.yaw) * 0.25,
    };
    const publicStop = c.near.hit.point;
    const nearestNode =
      Math.hypot(publicStop.x - c.near.a.x, publicStop.z - c.near.a.z) <
      Math.hypot(publicStop.x - c.near.b.x, publicStop.z - c.near.b.z)
        ? c.near.a.id
        : c.near.b.id;
    stores.push({
      id: `store:7-eleven:${c.region}:${count + 1}`,
      brand: B.id,
      name: B.name,
      region: c.region,
      variant,
      parcel: c.b,
      road: c.near.r,
      front: c.front,
      yaw: c.yaw,
      width,
      entrance,
      publicStop,
      nearestNode,
      source: "representative-compressed-storefront",
      forecourt: [],
      services: ["water", "refreshments", "snacks"],
      interaction: { enabled: false, radius: 3.5, futureEnergy: true },
    });
    counts.set(c.region, count + 1);
  }
  // Only real, collision-backed forecourts receive ground props. A narrow
  // pavement remains clear instead of decorating every doorway indiscriminately.
  const index = placementIndex(d);
  for (const s of stores)
    for (const kind of ["bin", "motorcycle"] as const) {
      if (kind === "motorcycle" && s.width < 9) continue;
      const u = s.width * (kind === "bin" ? 0.38 : -0.35),
        v = kind === "bin" ? 1.4 : 1.9,
        c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw),
        body: Obstacle = {
          x: s.front.x + c * u + sn * v,
          z: s.front.z - sn * u + c * v,
          w: kind === "bin" ? 0.75 : 2.2,
          d: kind === "bin" ? 0.7 : 0.85,
          height: kind === "bin" ? 1.15 : 1.35,
          yaw: s.yaw,
          color: kind === "bin" ? B.green : "#496d77",
          artRole: "furniture",
          environmentId: `${s.id}:${kind}`,
        };
      if (!index.clear(body, true)) continue;
      d.obstacles.push(body);
      index.insert(body);
      s.forecourt.push({ kind, body });
    }
  planned.set(d, stores);
  return stores;
}

export function emitConvenienceStores(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  for (const s of planConvenienceStores(d)) {
    const c = Math.cos(s.yaw),
      sn = Math.sin(s.yaw),
      W = s.width;
    const put = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      surface: ArtPiece["surface"] = "panel",
      layer: ArtPiece["layer"] = "core",
      yaw = s.yaw,
    ) =>
      emit({
        x: s.front.x + c * u + sn * v,
        z: s.front.z - sn * u + c * v,
        y,
        w,
        h,
        d: depth,
        color,
        surface,
        layer,
        yaw,
        siteId: s.id,
      });
    // All detail is attached to the existing collision-backed facade. Opaque
    // tinted glazing avoids transparent sorting/overdraw on mobile Safari.
    put(0, 2.15, 0.18, W, 4.1, 0.28, "#efebd7");
    put(0, 1.72, 0.36, W - 0.44, 2.8, 0.08, "#52898b");
    put(0, 1.65, 0.41, W - 0.65, 2.5, 0.04, "#b9e4c7", "panel", "night");
    for (const u of [-W * 0.35, 0, W * 0.35]) {
      put(u, 1.65, 0.46, 0.09, 2.7, 0.1, "#d3ded3", "metal");
      put(u, 2.56, 0.45, W * 0.22, 0.09, 0.05, "#eff5d9", "panel", "night");
    }
    put(0, 0.25, 0.39, W, 0.3, 0.18, "#aaa79c", "concrete");
    put(0, 3.55, 0.37, W + 0.14, 1.18, 0.38, B.white);
    // Authentic horizontal orange/red/green bands span the whole fascia;
    // a central square 7-Eleven mark interrupts them, as on Thai storefronts.
    for (const [y, color] of [
      [3.9, B.orange],
      [3.61, B.red],
      [3.32, B.green],
    ] as const)
      put(0, y, 0.59, W + 0.12, 0.21, 0.08, color, "panel", "night");
    put(0, 3.58, 0.67, 1.72, 1.72, 0.18, B.white);
    for (const u of [-0.52, 0.52]) {
      put(u, 1.62, 0.51, 0.055, 0.7, 0.08, "#edf3e0", "metal");
      put(u, 1.6, 0.49, 0.96, 2.62, 0.04, "#77b0a4");
    }
    // Refrigerated cabinet silhouette, window product strips and a wall AC
    // imply an occupied shop without an interior simulation or point lights.
    for (const side of [-1, 1]) {
      put(side * W * 0.31, 0.7, 0.48, W * 0.23, 0.32, 0.08, "#f4cf68");
      put(
        side * W * 0.31,
        1.1,
        0.48,
        W * 0.23,
        0.18,
        0.07,
        side < 0 ? "#ca6260" : "#66a171",
      );
    }
    put(W * 0.34, 4.8, 0.24, 1.25, 0.65, 0.45, "#d2d4c4", "metal", "detail");
    put(W * 0.34, 4.8, 0.48, 0.6, 0.4, 0.02, "#858e82", "metal", "detail");
    if (s.variant === "corner") {
      // A shallow projecting double-sided blade identifies a corner shop;
      // its outer edge remains within the existing setback from the roadway.
      put(-W / 2 + 0.4, 4.05, 0.85, 0.12, 1.62, 1.62, B.green, "metal");
    }
    if (s.variant === "standalone") {
      put(0, 4.38, 0.05, W + 0.2, 0.18, 1.3, "#aab5ac", "metal");
      put(0, 4.22, 0.47, W, 0.05, 0.55, "#ededd1", "panel", "night");
    }
    if (s.variant === "transit")
      put(0, 4.42, 0.23, W + 0.18, 0.16, 0.9, "#678988", "metal");
    if (s.variant === "tower")
      for (const side of [-1, 1])
        put(side * (W / 2 - 0.16), 2, 0.32, 0.24, 3.9, 0.3, "#69828a", "metal");
    for (const { kind, body } of s.forecourt) {
      const prop = (
        u: number,
        y: number,
        v: number,
        w: number,
        h: number,
        depth: number,
        color: string,
        shape: ArtPiece["shape"] = "box",
      ) =>
        emit({
          x: body.x + c * u + sn * v,
          z: body.z - sn * u + c * v,
          y,
          w,
          h,
          d: depth,
          color,
          yaw: s.yaw,
          surface: "metal",
          shape,
          layer: "detail",
          siteId: s.id,
        });
      if (kind === "bin") {
        prop(0, 0.5, 0, 0.65, 0.95, 0.6, B.green);
        prop(0, 1.01, 0, 0.72, 0.1, 0.67, "#d3d8c5");
        prop(0, 0.82, 0.31, 0.34, 0.15, 0.03, "#35493b");
      } else {
        prop(-0.7, 0.29, 0, 0.5, 0.52, 0.24, "#354443", "orb");
        prop(0.7, 0.29, 0, 0.5, 0.52, 0.24, "#354443", "orb");
        prop(0, 0.57, 0, 1.52, 0.27, 0.54, "#668a91");
        prop(-0.24, 0.85, 0, 0.9, 0.17, 0.5, "#343d3d");
        prop(0.62, 0.91, 0, 0.19, 0.65, 0.22, "#a9b4a9");
        prop(0.62, 1.22, 0, 0.12, 0.1, 0.7, "#a9b4a9");
      }
    }
  }
}

/** Existing BangkokSign chunks supply spatial culling, day/night control and
 * disposeObject ownership. One texture/material for every store in the city. */
export function buildConvenienceStoreSigns(d: District) {
  const root = new T.Group();
  root.name = "7-ElevenStoreSigns";
  if (typeof document === "undefined") return root;
  const stores = planConvenienceStores(d);
  if (!stores.length) return root;
  const tex = createStoreBrandAtlas(),
    material = new T.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: "#ffffff",
      emissiveIntensity: 0.12,
      roughness: 0.55,
    });
  const batch = new StaticBatch(),
    tiles = [storeBrandTile(0), storeBrandTile(1)],
    temp = new T.Object3D();
  for (const s of stores) {
    const c = Math.cos(s.yaw),
      sn = Math.sin(s.yaw);
    const sign = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      tile: number,
      rotation = 0,
    ) => {
      temp.position.set(
        s.front.x + c * u + sn * v,
        y,
        s.front.z - sn * u + c * v,
      );
      temp.rotation.set(0, s.yaw + rotation, 0);
      temp.scale.set(w, h, 1);
      temp.updateMatrix();
      batch.add(tiles[tile]!, material, [temp.matrix.clone()]);
    };
    sign(0, 3.58, 0.775, 1.57, 1.57, 0);
    sign(s.width * 0.31, 2.03, 0.555, Math.min(1.2, s.width * 0.18), 1.04, 1);
    if (s.variant === "corner")
      for (const side of [-1, 1])
        sign(
          -s.width / 2 + 0.4 + side * 0.067,
          4.05,
          0.85,
          1.5,
          1.5,
          0,
          (side * Math.PI) / 2,
        );
  }
  for (const chunk of batch.finish()) {
    chunk.name = "BangkokSign";
    root.add(chunk);
  }
  return root;
}
