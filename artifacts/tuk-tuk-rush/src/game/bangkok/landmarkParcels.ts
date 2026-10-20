import { HUA_PLAN } from './huaLamphong';
import { PHO_WEST_APPROACH, PHO_PIER_PASSAGE } from './historicPlan';
import type { District, Landmark, Obstacle, Point } from "../types";
import { principalApproach } from "./landmarkVisibility";
import type { ArtPiece } from "./architecturalBatch";

export type ProtectedParcel = {
  id: string;
  landmarkId: string;
  use: "structure" | "compound" | "forecourt" | "entrance";
  boundary: Point[];
};
export type FacadeApproach = {
  /** Model-local feature, not a guessed building centre. +Z is model front. */
  feature: [number, number, number];
  outward: number;
  width: number;
  depth: number;
  road?: string;
  note: string;
};
/** These are miniature composition controls, NOT survey measurements. The
 * owning landmark's live plot/yaw is the only world transform. Preserve dense
 * neighbours outside a modest entrance apron rather than clearing a vista cone. */
export const FACADE_APPROACHES: Record<string, FacadeApproach> = {
  palace: {
    feature: [0, 6, -100.65],
    outward: Math.PI,
    width: 60,
    depth: 50,
    road: "palace_n",
    note: "North visitor gate toward the public Na Phra Lan curbside stop.",
  },
  swing: {
    feature: [0, 15, -58],
    outward: Math.PI,
    width: 58,
    depth: 60,
    road: "sao-chingcha",
    note: "North public approach to the Giant Swing plaza, with Wat Suthat behind the swing.",
  },
  hua: {
    feature: [0, 19, 30],
    outward: 0,
    width: 80,
    depth: 39,
    road: "ramaiv",
    note: "Historic south facade toward Rama IV; compressed diagonal junction retained. MRT BL28 is underground.",
  },
  golden: {feature:[0,46,0],outward:Math.PI/2,width:30,depth:16,road:"boripat",note:"Temple hill seen from Boripat; lower courts remain pedestrian."},
  traimit: {feature:[0,20,26],outward:0,width:56,depth:24,road:"tri-mit",note:"Golden Buddha mondop and south Tri Mit approach, northeast of Odeon."},
  democracy: {feature:[0,20,0],outward:0,width:42,depth:20,road:"democracy-circle",note:"Civic island in the live clockwise traffic ring."},
  gate: {feature:[0,13,4.3],outward:0,width:30,depth:10,road:"odeon",note:"Chinese gateway on Odeon island; Yaowarat leaves toward the west."},
  pho: {feature:[8,7,68],outward:0,width:34,depth:16,road:"old_w",note:"Retained Wat Pho compound and south gate; river and Tha Tien west."},
  paragon: {
    feature: [0, 15, 34],
    outward: 0,
    width: 78,
    depth: 36,
    road: "old_siam",
    note: "South retail approach and Siam pedestrian frontage.",
  },
  "siam-center": {
    feature: [0, 13, 28],
    outward: 0,
    width: 146,
    depth: 34,
    road: "old_siam",
    note: "South Rama I frontage; Discovery west of Center.",
  },
  mbk: {
    feature: [0, 14, 30],
    outward: 0,
    width: 112,
    depth: 32,
    road: "old_siam",
    note: "North Rama I frontage; south and east street elevations retained.",
  },
  central: {
    feature: [0, 16, 22],
    outward: 0,
    width: 115,
    depth: 40,
    road: "ratchadamri",
    note: "East Ratchadamri shopping frontage after owner rotation.",
  },
  terminal: {
    feature: [-27, 12, 34],
    outward: 0,
    width: 72,
    depth: 30,
    road: "sukhumvit",
    note: "South Sukhumvit frontage; Asok-side vehicle arrival remains separate.",
  },
  emporium: {
    feature: [-16, 5, 50],
    outward: 0,
    width: 68,
    depth: 20,
    road: "sukhumvit-east",
    note: "North shopping facade south of Sukhumvit.",
  },
  emquartier: {
    feature: [0, 17, 49],
    outward: 0,
    width: 78,
    depth: 24,
    road: "sukhumvit-east",
    note: "South frontage north of Sukhumvit; several real entrances.",
  },
  emsphere: {
    feature: [0, 8, 41],
    outward: 0,
    width: 64,
    depth: 20,
    road: "sukhumvit-east",
    note: "North shopping frontage; Soi 22 drop-off separate.",
  },
  icon: {
    feature: [32.5, 14, 0],
    outward: Math.PI / 2,
    width: 56,
    depth: 22,
    note: "East river elevation. Charoen Nakhon vehicle entrance remains on west side.",
  },
  "river-city": {
    feature: [0, 11, 24],
    outward: 0,
    width: 76,
    depth: 18,
    note: "West river elevation; east street entrance separately recorded.",
  },
  oriental: {
    feature: [0, 19, 36],
    outward: 0,
    width: 90,
    depth: 18,
    note: "West-facing river terrace, distinct from Oriental Avenue arrival.",
  },
  shangri: {
    feature: [0, 22, 38],
    outward: 0,
    width: 96,
    depth: 18,
    note: "River-facing west elevation; separate street driveway.",
  },
  peninsula: {
    feature: [0, 22, 28],
    outward: 0,
    width: 62,
    depth: 18,
    note: "East river-facing W-profile and terrace.",
  },
  hilton: {
    feature: [0, 24, 22],
    outward: 0,
    width: 43,
    depth: 16,
    note: "East river elevation; preserve ThreeSixty silhouette.",
  },
  "four-seasons": {
    feature: [0, 18, 37],
    outward: 0,
    width: 150,
    depth: 15,
    note: "West river courts, with east road arrival.",
  },
  capella: {
    feature: [0, 16, 31],
    outward: 0,
    width: 78,
    depth: 16,
    note: "West river villas, east street arrival.",
  },
  anantara: {
    feature: [0, 12, 38],
    outward: 0,
    width: 82,
    depth: 17,
    note: "East river garden, west Charoen Nakhon approach.",
  },
};
export function localPoint(
  origin: Point,
  yaw: number,
  x: number,
  z: number,
): Point {
  return {
    x: origin.x + Math.cos(yaw) * x + Math.sin(yaw) * z,
    z: origin.z - Math.sin(yaw) * x + Math.cos(yaw) * z,
  };
}
export function rectangleBoundary(
  o: Pick<Obstacle, "x" | "z" | "w" | "d" | "yaw">,
): Point[] {
  return [
    [-o.w / 2, -o.d / 2],
    [o.w / 2, -o.d / 2],
    [o.w / 2, o.d / 2],
    [-o.w / 2, o.d / 2],
  ].map(([x, z]) => localPoint(o, o.yaw ?? 0, x!, z!));
}
/** Convex polygon SAT, including rotated rectangles. Test edges from BOTH
 * polygons; a long building can cross a forecourt with its centre outside. */
export function polygonsOverlap(
  a: readonly Point[],
  b: readonly Point[],
  padding = 0,
): boolean {
  for (const p of [a, b])
    for (let i = 0; i < p.length; i++) {
      const first = p[i]!,
        second = p[(i + 1) % p.length]!,
        nx = second.z - first.z,
        nz = first.x - second.x,
        len = Math.hypot(nx, nz);
      if (!len) continue;
      const project = (q: readonly Point[]) =>
        q.map((v) => (v.x * nx + v.z * nz) / len);
      const aa = project(a),
        bb = project(b);
      if (
        Math.max(...aa) + padding <= Math.min(...bb) ||
        Math.max(...bb) + padding <= Math.min(...aa)
      )
        return false;
    }
  return true;
}
type Plan = {
  parcels: ProtectedParcel[];
  cells: Map<string, ProtectedParcel[]>;
};
const plans = new WeakMap<District, Plan>();
function cellKeys(points: readonly Point[], padding = 0): string[] {
  const xs = points.map((p) => p.x),
    zs = points.map((p) => p.z),
    keys: string[] = [];
  for (
    let x = Math.floor((Math.min(...xs) - padding) / 80);
    x <= Math.floor((Math.max(...xs) + padding) / 80);
    x++
  )
    for (
      let z = Math.floor((Math.min(...zs) - padding) / 80);
      z <= Math.floor((Math.max(...zs) + padding) / 80);
      z++
    )
      keys.push(`${x}:${z}`);
  return keys;
}
export function facadeFeature(l: Landmark, spec = FACADE_APPROACHES[l.id!]) {
  if (!spec || !l.plot) return;
  return {
    ...localPoint(l.plot, l.yaw ?? 0, spec.feature[0], spec.feature[2]),
    y: spec.feature[1],
    yaw: (l.yaw ?? 0) + spec.outward,
  };
}
export function prepareLandmarkParcels(d: District, includeHistoricApproaches = true): ProtectedParcel[] {
  const parcels: ProtectedParcel[] = [],
    cells = new Map<string, ProtectedParcel[]>();
  const add = (
    landmarkId: string,
    use: ProtectedParcel["use"],
    boundary: Point[],
  ) => {
    const p = {
      id: `parcel:${landmarkId}:${use}:${parcels.length}`,
      landmarkId,
      use,
      boundary,
    };
    parcels.push(p);
    for (const key of cellKeys(boundary)) {
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(p);
    }
  };
  for (const l of d.landmarks) {
    if (!l.plot) continue;
    if (l.id === 'pho' && includeHistoricApproaches) {
      add(l.id, 'forecourt', PHO_WEST_APPROACH);
      const {from:a,to:b,width}=PHO_PIER_PASSAGE;
      add(l.id,'entrance',rectangleBoundary({x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:width,d:Math.hypot(a.x-b.x,a.z-b.z),yaw:Math.atan2(b.x-a.x,b.z-a.z)}));
    }
    const site = d.authoredSites?.find((s) => s.id === l.id);
    for (const o of site?.reservations ??
      d.obstacles.filter((o) => o.landmarkId === l.id && !o.artRole))
      add(l.id!, "structure", rectangleBoundary(o));
    const grounds: Record<string, [number,number,number,number]> = {
      golden:[0,12,106,132], traimit:[0,4,64,66],
      hua:[0,HUA_PLAN.yard.centerZ,HUA_PLAN.yard.width,HUA_PLAN.yard.depth], palace:[0,0,202.5,202.5], pho:[7.5,18,119,104],
      swing:[0,0,86,150],
    };
    if(l.id==='democracy')add(l.id,'compound',Array.from({length:32},(_,i)=>localPoint(l.plot!,0,Math.cos(i*Math.PI/16)*28,Math.sin(i*Math.PI/16)*28)));
    const ground=grounds[l.id!];
    if(ground) add(l.id!,"compound",rectangleBoundary({...localPoint(l.plot!,l.yaw??0,ground[0],ground[1]),w:ground[2],d:ground[3],yaw:l.yaw??0}));
    const spec = FACADE_APPROACHES[l.id!],
      f = facadeFeature(l, spec);
    if (!spec || !f) continue;
    if (l.id === "hua") {
      // Trapezoid follows the compressed Charoen Krung/Rama IV approach.
      // Western corner stops short of the diagonal street. No arbitrary plaza.
      add(
        l.id,
        "forecourt",
        [
          [-43, 32],
          [43, 32],
          [43, 70],
          [11, 76],
          [-43, 48],
        ].map(([x, z]) => localPoint(l.plot!, l.yaw ?? 0, x!, z!)),
      );
    } else {
      const origin = {
        x: f.x + (Math.sin(f.yaw) * spec.depth) / 2,
        z: f.z + (Math.cos(f.yaw) * spec.depth) / 2,
      };
      add(
        l.id!,
        "forecourt",
        rectangleBoundary({
          ...origin,
          w: spec.width,
          d: spec.depth,
          yaw: f.yaw,
        }),
      );
    }
    const approach = spec.road && principalApproach(d, l);
    if (approach) {
      const length = Math.hypot(approach.x - f.x, approach.z - f.z);
      // Preserve a narrow real-inspired entrance connection through the
      // compressed frontage setback, not a whole empty view cone.
      if (length > spec.depth && length < 180) {
        const end = {
          x: approach.x + ((f.x - approach.x) * 10) / length,
          z: approach.z + ((f.z - approach.z) * 10) / length,
        };
        add(
          l.id!,
          "entrance",
          rectangleBoundary({
            x: (end.x + f.x) / 2,
            z: (end.z + f.z) / 2,
            w: 18,
            d: length - 10,
            yaw: Math.atan2(end.x - f.x, end.z - f.z),
          }),
        );
      }
    }
    // Narrow pedestrian/vehicle access reservation follows existing authored
    // entrance geometry. It does not move public streets or add solid walls.
    if (site) {
      const a = site.entrance,
        b = d.nodes.find((n) => n.id === site.accessNode);
      if (a && b && Math.hypot(a.x - b.x, a.z - b.z) > 1)
        add(
          l.id!,
          "entrance",
          rectangleBoundary({
            x: (a.x + b.x) / 2,
            z: (a.z + b.z) / 2,
            w: 9,
            d: Math.hypot(a.x - b.x, a.z - b.z),
            yaw: Math.atan2(a.x - b.x, a.z - b.z),
          }),
        );
    }
  }
  plans.set(d, { parcels, cells });
  return parcels;
}
export const landmarkParcels = (d: District) => plans.get(d)?.parcels ?? [];
export function parcelConflicts(
  d: District,
  o: Obstacle,
  padding = 0,
): ProtectedParcel[] {
  const plan = plans.get(d);
  if (!plan) return [];
  const boundary = rectangleBoundary(o),
    candidates = new Set<ProtectedParcel>();
  for (const key of cellKeys(boundary, padding))
    plan.cells.get(key)?.forEach((p) => candidates.add(p));
  return [...candidates].filter((p) =>
    polygonsOverlap(boundary, p.boundary, padding),
  );
}
export const inLandmarkParcel = (d: District, o: Obstacle) =>
  parcelConflicts(d, o, 0.6).length > 0;

/** Finish the narrow new pedestrian connections in the same spatial/material
 * batch as city paving. They remain walkways, not phantom navigable roads. */
export function emitLandmarkApproaches(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  // Public pavement belongs to the city ground batch, outside the sacred
  // landmark's physical model/collider envelope. Narrow strips follow the
  // same protected polygon without paving across Maha Rat's asphalt.
  for(let z=-776;z<-626;z+=2) {
    const west=z<-703?-930+(z+777)*66/74:-864,east=-851;
    emit({x:(west+east)/2,z,y:.07,w:east-west-.6,h:.06,d:2,yaw:0,color:'#c9bd9f',surface:'concrete',siteId:'pho-west-pavement'});
  }
  for (const p of landmarkParcels(d).filter((p) => p.use === "entrance")) {
    const [a, b, c] = p.boundary;
    if (!a || !b || !c) continue;
    const w = Math.hypot(b.x - a.x, b.z - a.z),
      depth = Math.hypot(c.x - b.x, c.z - b.z),
      center = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 };
    if (w < 12 || depth < 20) continue;
    emit({
      ...center,
      y: 0.025,
      w: w - 0.4,
      h: 0.04,
      d: depth,
      yaw: Math.atan2(c.x - b.x, c.z - b.z),
      color: "#c3bfad",
      surface: "concrete",
      siteId: p.id,
    });
  }
}
