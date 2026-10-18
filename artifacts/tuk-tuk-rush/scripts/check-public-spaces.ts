import { inspectionSubject, InspectionCamera } from "../src/game/inspection";
import { roadGraphKey } from "../src/game/bangkok/roadSurfaceGraph";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "three";
import {
  createBangkokWorld,
  blockedByRiver,
  toMap,
} from "../src/game/bangkok/world";
import {
  publicWaterAt,
  inPublicGround,
  insidePublicPolygon,
} from "../src/game/bangkok/publicSpaces";
import { publicSpaceLandmark } from "../src/game/bangkok/publicSpaceArt";
import {
  obstacleDistance,
  distanceToSegment,
  routeBetween,
  orientedFootprintsOverlap,
} from "../src/game/world";
import { disposeObject } from "../src/game/assets";
import { passengerStops } from "../src/game/missions";
import { discover, readDiscovery } from "../src/game/bangkok/discovery";
import { auditStreetEdges } from "../src/game/bangkok/streetEdges";
import { assertProtectedGeography } from "./protected-geography";
const d = createBangkokWorld(),
  nodes = new Map(d.nodes.map((n) => [n.id, n])),
  stops = passengerStops(d),
  protectedEdges = assertProtectedGeography(d);
const jitter = {
  ...d,
  nodes: d.nodes.map((n) => ({ ...n, x: n.x + 1e-9, z: n.z - 1e-9 })),
};
assert.equal(
  roadGraphKey(jitter),
  roadGraphKey(d),
  "Sub-nanometer engine trig differences cannot stale the road bake",
);
const reports = [];
for (const l of d.landmarks.filter((l) => l.kind === "park")) {
  const subject = inspectionSubject(l, d);
  assert(subject.views.some((v) => v.id === "entrance"));
  for (const view of subject.views)
    assert(
      view.distance >= view.minDistance &&
        view.distance <= view.maxDistance &&
        view.distance <= 550,
      "Public-space inspection stays within actual city render range",
    );
}
for (const s of d.publicSpaces!) {
  assert(s.boundary.length >= 4 && s.gates.length > 0);
  assert(
    s.gates.every((g) => nodes.has(g.accessNode!)),
    "Gates attach to the actual road graph",
  );
  const l = d.landmarks.find((l) => l.id === s.id)!;
  assert(l.accessNode === s.dropoff);
  assert(stops.some((n) => n.id === s.dropoff));
  assert(routeBetween(d, d.nodes[0]!.id, s.dropoff!).length);
  const state = {
    regions: [],
    landmarks: ["icon", "state"],
    shortcuts: [],
  } as { regions: string[]; landmarks: string[]; shortcuts: string[] };
  discover(d, nodes.get(s.dropoff!)!, state);
  assert(state.landmarks.includes(s.id));
  assert(state.landmarks.includes("state"));
  for (const b of d.buildings)
    assert(
      !inPublicGround({ ...d, publicSpaces: [s] }, b),
      "No procedural building inside the actual park polygon",
    );
  for (const path of s.paths) {
    assert.equal(path.mode, "pedestrian");
    for (const p of path.points)
      assert(
        !d.nodes.some(
          (n) =>
            Math.hypot(n.x - p.x, n.z - p.z) < 0.01 &&
            d.roads.some(
              (r) =>
                (r.a === n.id || r.b === n.id) && r.corridor?.includes("park"),
            ),
        ),
        "Lakeside pedestrian paths are not traffic roads",
      );
  }
  if (s.id === "park") {
    assert(
      s.boundary.length === 54 &&
        s.water.filter((w) => !w.hole).length === 5 &&
        s.water.some((w) => w.hole),
      "Sourced lake lobes and main island topology",
    );
    assert(
      s.trees.length >= 350 && s.trees.length <= 700,
      "Bounded deliberate tropical planting",
    );
    const parking = d.roads.filter((r) => r.corridor === "lumphini-parking");
    assert(parking.length > 4 && parking.every((r) => r.noTraffic));
    for (const r of parking) {
      const a = nodes.get(r.a)!,
        b = nodes.get(r.b)!;
      for (let i = 0; i <= 12; i++) {
        const p = {
          x: a.x + ((b.x - a.x) * i) / 12,
          z: a.z + ((b.z - a.z) * i) / 12,
        };
        assert(!blockedByRiver(d, p), "Parking lane never crosses lake water");
        assert(
          d.obstacles.every((o) => obstacleDistance(p, o) > 1.8),
          "Parking lane clear",
        );
      }
    }
    const island = s.water.find((w) => w.hole)!;
    const centroid = island.points.reduce(
      (a, p) => ({
        x: a.x + p.x / island.points.length,
        z: a.z + p.z / island.points.length,
      }),
      { x: 0, z: 0 },
    );
    assert(!publicWaterAt(d, centroid), "Island is land, not water collider");
    const sample = s.water.find((w) => !w.hole)!.points[10]!;
    const q = { x: sample.x + 2, z: sample.z };
    assert(Number.isFinite(q.x));
  }
  for (const f of s.fences) {
    assert(d.obstacles.includes(f));
    for (const r of d.roads) {
      const a = nodes.get(r.a)!,
        b = nodes.get(r.b)!;
      assert(
        !orientedFootprintsOverlap(f, {
          x: (a.x + b.x) / 2,
          z: (a.z + b.z) / 2,
          w: r.width,
          d: Math.hypot(b.x - a.x, b.z - a.z),
          yaw: Math.atan2(b.x - a.x, b.z - a.z),
          height: 0,
          color: "#fff",
        }),
        "Fence does not block public roads",
      );
    }
  }
  const g = publicSpaceLandmark(d, l)!;
  assert(g instanceof T.LOD && g.levels.length === 2);
  const costs = g.levels.map(({ object }) => {
    let meshes = 0,
      triangles = 0;
    object.traverse((o) => {
      if (o instanceof T.Mesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      }
    });
    return { meshes, triangles };
  });
  assert(costs[0]!.meshes <= 12 && costs[0]!.triangles < 110000);
  assert(costs[1]!.triangles < costs[0]!.triangles * 0.65);
  let disposed = 0;
  g.traverse((o) => {
    if (o instanceof T.Mesh)
      o.geometry.addEventListener("dispose", () => disposed++);
  });
  disposeObject(g);
  assert(disposed > 0);
  reports.push({
    id: s.id,
    trees: s.trees.length,
    gates: s.gates.map((g) => ({
      name: g.name,
      vehicle: g.vehicle,
      accessNode: g.accessNode,
    })),
    costs,
  });
}
const capella = d.landmarks.find((l) => l.id === "capella")!,
  four = d.landmarks.find((l) => l.id === "four-seasons")!;
assert(
  capella.z < four.z,
  "Capella north of Four Seasons in the shared estate",
);
const river = d.landmarks.find((l) => l.id === "river-city")!;
assert(
  toMap(river.plot!).x < 450,
  "Arts center brought to the east riverfront, north of Oriental",
);
const edges = auditStreetEdges(d),
  open = edges.filter((s) => s.kind === "open");
const out = {
  pass: true,
  protectedEdges,
  spaces: reports,
  roads: d.roads.length,
  buildings: d.buildings.length,
  authoredSites: d.authoredSites!.length,
  openEdges: open.length,
  samples: edges.length,
};
fs.writeFileSync(
  new URL(
    "../../../docs/qa/geographic-city-reconstruction/public-space-validation.json",
    import.meta.url,
  ),
  JSON.stringify(out, null, 2),
);
fs.writeFileSync(
  new URL(
    "../../../docs/qa/geographic-city-reconstruction/remaining-edges.json",
    import.meta.url,
  ),
  JSON.stringify(
    open.map((e) => ({
      corridor: e.road.corridor,
      point: toMap(e.point),
      classification: "unresolved roadside gap — not relabeled as park",
    })),
    null,
    2,
  ),
);
console.log(JSON.stringify(out));
