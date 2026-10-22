import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import type { Point, RoadNode } from "../src/game/types";
import type { VehicleContact } from "../src/game/vehicle";
import { lanePoint } from "../src/game/traffic";
import { distanceToSegment } from "../src/game/world";
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import("../src/game/engine");
const { routeFromPoint, blockedByRiver, SHIFT_SECONDS } =
  await import("../src/game/bangkok/world");
const { riverPiers } = await import("../src/game/bangkok/riverfront");
let contacts: VehicleContact[] = [];
const e = new GameEngine({
    seed: Number(process.env.WATERFRONT_SEED ?? 26),
    observeContact: (c) => contacts.push(c),
  }),
  d = e.model.district,
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
const stops = new Map<string, RoadNode>();
for (const l of d.landmarks)
  if (l.accessNode) stops.set(l.id!, nodes.get(l.accessNode)!);
for (const corridor of ["pinklao", "memorial", "taksin"]) {
  const ids = new Set(
      d.roads.filter((r) => r.corridor === corridor).flatMap((r) => [r.a, r.b]),
    ),
    p = d.nodes.filter((n) => ids.has(n.id)).sort((a, b) => a.x - b.x);
  stops.set(corridor + "-west", p[0]!);
  stops.set(corridor + "-east", p.at(-1)!);
}
for (const [id, corridor] of [
  ["songwat", "songwat"],
  ["talatnoi", "songwat"],
]) {
  const pier = riverPiers(d).find(
      (p) => p.id === (id === "talatnoi" ? "river-city" : id),
    )!,
    point =
      id === "talatnoi"
        ? d.landmarks.find((l) => l.id === "river-city")!.plot!
        : pier.shore;
  const ids = new Set(
    d.roads
      .filter((r) => r.corridor === corridor && !r.bridge)
      .flatMap((r) => [r.a, r.b]),
  );
  const n = d.nodes
    .filter((n) => ids.has(n.id) && !blockedByRiver(d, n))
    .sort(
      (a, b) =>
        Math.hypot(a.x - point.x, a.z - point.z) -
        Math.hypot(b.x - point.x, b.z - point.z),
    )[0];
  assert(n, `Existing ${id} street`);
  stops.set(id, n);
}
const sathorn = riverPiers(d).find((p) => p.id === "sathorn")!.shore;
const east = new Set(
  d.roads
    .filter((r) => !r.bridge && !r.destinationId && r.corridor === "charoen_s")
    .flatMap((r) => [r.a, r.b]),
);
stops.set(
  "sathorn",
  d.nodes
    .filter((n) => east.has(n.id) && !blockedByRiver(d, n))
    .sort(
      (a, b) =>
        Math.hypot(a.x - sathorn.x, a.z - sathorn.z) -
        Math.hypot(b.x - sathorn.x, b.z - sathorn.z),
    )[0]!,
);
const pairs = [
  ["gate", "songwat"],
  ["songwat", "talatnoi"],
  ["talatnoi", "river-city"],
  ["river-city", "oriental"],
  ["oriental", "river-city"],
  ["hilton", "icon"],
  ["icon", "hilton"],
  ["icon", "peninsula"],
  ["oriental", "peninsula"],
  ["peninsula", "oriental"],
  ["peninsula", "shangri"],
  ["shangri", "sathorn"],
  ["sathorn", "capella"],
  ["capella", "four-seasons"],
  ["four-seasons", "asiatique"],
  ["asiatique", "four-seasons"],
  ["asiatique", "anantara"],
  ["anantara", "asiatique"],
  ["anantara", "icon"],
  ["pho", "arun"],
  ["arun", "pho"],
  ...["pinklao", "memorial", "taksin"].flatMap((b) => [
    [b + "-west", b + "-east"],
    [b + "-east", b + "-west"],
  ]),
];
const baseline = JSON.parse(
  gunzipSync(
    fs.readFileSync(
      new URL(
        "../../../docs/qa/waterfront-certification/traces/before-fares.json.gz",
        import.meta.url,
      ),
    ),
  ).toString(),
);
const cases = pairs.map(([from, to]) => ({
  id: `${from}>${to}`,
  a: stops.get(from!)!,
  b: stops.get(to!)!,
  start: undefined as any,
}));
for (const [goal, stage] of [
  [3, "delivery"],
  [10, "pickup"],
] as const) {
  const j = baseline.journeys.find(
    (j: any) => j.goal === goal && j.expected === stage,
  );
  cases.push({
    id: `original-${goal}-${stage}`,
    a: j.start,
    b: j.target,
    start: j.start,
  });
}
const results: any[] = [],
  traffic = process.env.WATERFRONT_TRAFFIC === "1";
const laneMode = process.env.WATERFRONT_LANES === "1";
for (const c of cases.filter(
  (c) => !laneMode || /^(pinklao|memorial|taksin)-/.test(c.id),
)) {
  e.start("free");
  if (!traffic) e.model.traffic.length = 0;
  const full = routeFromPoint(d, c.a, c.b);
  const laneSegments = full.slice(1).map((b, i) => ({ a: full[i]!, b }));
  let path = full.slice(1);
  if (laneMode) {
    const points = full.map((p, i) => {
      const offsets = [];
      for (const j of [i - 1, i])
        if (j >= 0 && j < full.length - 1) {
          const a = full[j] as RoadNode,
            b = full[j + 1] as RoadNode,
            r = d.roads.find(
              (r) =>
                (r.a === a.id && r.b === b.id) ||
                (!r.oneWay && r.b === a.id && r.a === b.id),
            );
          assert(r, "Legal directed lane edge");
          offsets.push(lanePoint(a, b, r, j === i ? 0 : 1));
        }
      return {
        ...p,
        x: offsets.reduce((n, q) => n + q.x, 0) / offsets.length,
        z: offsets.reduce((n, q) => n + q.z, 0) / offsets.length,
      };
    });
    c.a = { ...c.a, ...points[0]! };
    c.b = { ...c.b, ...points.at(-1)! };
    path = points.slice(1);
  }
  assert(path.length, c.id + " connected");
  Object.assign(
    e.model.player,
    c.start ?? {
      ...c.a,
      heading: Math.atan2(path[0]!.x - c.a.x, path[0]!.z - c.a.z),
      speed: 0,
      collision: 0,
    },
  );
  e.model.mission = {
    pickup: c.a as RoadNode,
    destination: c.b,
    passenger: "Waterfront certification",
    limit: 100000,
  };
  Object.assign(e.model.snapshot, {
    stage: "delivery",
    target: c.b,
    tripTime: 100000,
    boarding: 0,
  });
  let index = 0,
    metres = 0,
    frames = 0,
    indicatorFrames = 0,
    minLeftOffset = Infinity;
  const physicalFrames: Record<string, number> = {
      static: 0,
      prop: 0,
      bridge: 0,
      traffic: 0,
      water: 0,
      boundary: 0,
    },
    events: any[] = [],
    trace: Point[] = [];
  for (
    let step = 0;
    step < 100000 && e.model.snapshot.deliveries === 0;
    step++
  ) {
    const p = e.model.player;
    let goal = path[index]!,
      distance = Math.hypot(goal.x - p.x, goal.z - p.z);
    while (distance < 5 && index < path.length - 1) {
      goal = path[++index]!;
      distance = Math.hypot(goal.x - p.x, goal.z - p.z);
    }
    const angle = Math.atan2(goal.x - p.x, goal.z - p.z) - p.heading,
      error = Math.atan2(Math.sin(angle), Math.cos(angle)),
      last = index === path.length - 1,
      stop = last && distance < 7.3,
      speed = last && distance < 20 ? 4 : Math.abs(error) > 0.35 ? 5 : 10;
    Object.assign(e.model.input, {
      steer: stop ? 0 : Math.max(-1, Math.min(1, -error * 2.3)),
      gas: !stop && p.speed < speed,
      brake: stop ? p.speed > 0.4 : p.speed > speed + 0.5,
    });
    const x = p.x,
      z = p.z;
    contacts = [];
    e.update(1 / 60);
    if (laneMode) {
      const nearest = laneSegments
          .map((s) => ({ ...s, q: distanceToSegment(p, s.a, s.b) }))
          .sort((a, b) => a.q.distance - b.q.distance)[0]!,
        dx = nearest.b.x - nearest.a.x,
        dz = nearest.b.z - nearest.a.z;
      minLeftOffset = Math.min(
        minLeftOffset,
        ((p.x - nearest.q.point.x) * dz - (p.z - nearest.q.point.z) * dx) /
          Math.hypot(dx, dz),
      );
    }
    metres += Math.hypot(p.x - x, p.z - z);
    if (p.collision) indicatorFrames++;
    frames++;
    const categories = new Set<string>();
    for (const event of contacts) {
      const id =
        event.obstacle?.environmentId ?? event.obstacle?.landmarkId ?? "";
      const kind =
        event.kind !== "static"
          ? event.kind
          : id.startsWith("bridge-rail:")
            ? "bridge"
            : event.obstacle?.artRole === "furniture"
              ? "prop"
              : "static";
      categories.add(kind);
      if (events.length < 200)
        events.push({
          frame: step,
          kind,
          id,
          trafficId: event.trafficId,
          x: event.x,
          z: event.z,
          heading: event.heading,
          speed: event.speed,
          normal: event.normal,
          penetration: event.penetration,
        });
    }
    categories.forEach((k) => physicalFrames[k]++);
    if (step % 30 === 0) trace.push({ x: p.x, z: p.z });
  }
  results.push({
    id: c.id,
    ...(laneMode ? { minLeftOffset } : {}),
    from: c.a,
    to: c.b,
    complete: e.model.snapshot.deliveries === 1,
    worldUnits: Math.round(metres),
    frames,
    indicatorFrames,
    physicalContactFrames: physicalFrames,
    trafficVehicles: e.model.traffic.length,
    events,
    trace,
  });
  console.log(
    JSON.stringify({ ...results.at(-1), trace: undefined, events: undefined }),
  );
}
// Lifecycle checks are separate from the uninterrupted controller journeys.
e.start("free");
e.model.traffic.length = 0;
const elapsed = e.model.snapshot.elapsed;
e.pause();
for (let i = 0; i < 20; i++) e.update(0.05);
assert.equal(e.model.snapshot.elapsed, elapsed);
e.resume();
const icon = stops.get("icon")!;
const revisions = [];
for (let i = 0; i < 3; i++) {
  Object.assign(e.model.player, { x: icon.x, z: icon.z, speed: 0 });
  assert(e.viewLandmark("icon"));
  const revision = e.cameraRevision;
  e.restart();
  assert(e.cameraRevision > revision && !e.model.snapshot.viewingLandmark);
  revisions.push(e.cameraRevision);
}
e.model.traffic.length = 0;
e.pause();
const river = d.river![Math.floor(d.river!.length * 0.55)]!,
  profile = JSON.stringify(e.career.profile),
  mission = e.model.mission;
Object.assign(e.model.player, river, { speed: 12 });
e.resume();
assert(!blockedByRiver(d, e.model.player));
assert.equal(JSON.stringify(e.career.profile), profile);
assert.equal(e.model.mission, mission);
e.start("shift");
e.model.traffic.length = 0;
for (
  let i = 0;
  i < Math.ceil(SHIFT_SECONDS / 0.05) + 5 &&
  e.model.snapshot.phase === "playing";
  i++
)
  e.update(0.05);
assert.equal(e.model.snapshot.phase, "ended");
e.returnToTitle();
e.start("free");
assert.equal(e.model.snapshot.phase, "playing");
assert.equal(e.model.snapshot.mode, "free");
e.dispose();
const report = {
  pass: results.every(
    (r) =>
      r.complete &&
      (traffic || r.indicatorFrames === 0) &&
      (!laneMode || r.minLeftOffset > 0.2),
  ),
  traffic,
  laneMode,
  seed: Number(process.env.WATERFRONT_SEED ?? 26),
  noMidRouteTeleports: true,
  physicsObserver: true,
  lifecycle: {
    pauseResume: true,
    iconRestarts: 3,
    revisions,
    submergedRecoveryPreservesProgress: true,
    completedShift: true,
    returnedToFreeRoam: true,
  },
  results,
};
const out = new URL(
  "../../../docs/qa/waterfront-certification/",
  import.meta.url,
);
fs.writeFileSync(
  new URL(
    `${laneMode ? "left-lane" : traffic ? "traffic" : "static"}-routes.json`,
    out,
  ),
  JSON.stringify(report, null, 2) + "\n",
);
assert(
  report.pass,
  "Every certified route completes; static mode requires zero contacts",
);
