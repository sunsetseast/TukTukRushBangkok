import assert from "node:assert/strict";
import fs from "node:fs";
import type { RoadNode } from "../src/game/types";
import type { VehicleContact } from "../src/game/vehicle";
import { lanePoint } from "../src/game/traffic";
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import("../src/game/engine");
const { routeFromPoint } = await import("../src/game/bangkok/world");
let contacts: VehicleContact[] = [];
const e = new GameEngine({ seed: 26, observeContact: (c) => contacts.push(c) }),
  d = e.model.district,
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
const stops = new Map<string, RoadNode>();
for (const l of d.landmarks)
  if (l.accessNode) stops.set(l.id!, nodes.get(l.accessNode)!);
const way = (id: string, corridor: string, x: number, y: number) => {
  const ids = new Set(
    d.roads.filter((r) => r.corridor === corridor).flatMap((r) => [r.a, r.b]),
  );
  const p = d.nodes
    .filter((n) => ids.has(n.id))
    .sort(
      (a, b) =>
        Math.hypot(a.x - (x - 500) * 4, a.z - (y - 600) * 4) -
        Math.hypot(b.x - (x - 500) * 4, b.z - (y - 600) * 4),
    )[0];
  assert(p, id + " has a real road");
  stops.set(id, p);
};
way("yaowarat-east", "yaowarat", 533, 581);
way("yaowarat-west", "yaowarat", 395, 520);
way("ratchawong", "ratchawong", 421, 552);
way("mangkon", "mangkon", 454, 574);
way("plaeng-nam", "plaeng-nam", 498, 523);
way("song-wat", "songwat", 458, 637);
way("talat-noi", "wanit-2-south", 465, 730);
way("bang-rak", "charoen_s", 535, 835);
way("memorial-east", "memorial", 330, 600);
const pairs = [
  ["yaowarat-east", "yaowarat-west"],
  ["gate", "traimit"],
  ["hua", "gate"],
  ["yaowarat-east", "ratchawong"],
  ["yaowarat-east", "song-wat"],
  ["song-wat", "talat-noi"],
  ["talat-noi", "river-city"],
  ["river-city", "bang-rak"],
  ["yaowarat-east", "memorial-east"],
  ["yaowarat-east", "icon"],
  ["yaowarat-east", "pho"],
  ["yaowarat-east", "paragon"],
  ["plaeng-nam", "mangkon"],
  ["wat-mangkon", "holy-rosary"],
];
const results: any[] = [],
  traffic = process.env.CHINATOWN_TRAFFIC === "1",
  lanes = process.env.CHINATOWN_LANES === "1";
for (const [from, to] of pairs.filter(
  (p) =>
    !process.env.CHINATOWN_ROUTE || p.join(">") === process.env.CHINATOWN_ROUTE,
)) {
  e.start("free");
  if (!traffic) e.model.traffic.length = 0;
  const a = stops.get(from!)!,
    b = stops.get(to!)!,
    full = routeFromPoint(d, a, b);
  assert(full.length > 1, from + ">" + to + " connected");
  for (let i = 1; i < full.length; i++)
    assert(
      d.roads.some(
        (r) =>
          (r.a === full[i - 1]!.id && r.b === full[i]!.id) ||
          (!r.oneWay && r.b === full[i - 1]!.id && r.a === full[i]!.id),
      ),
      "Every planned edge obeys its real one-way rule",
    );
  let points = full;
  if (lanes)
    points = full.map((p, i) => {
      const offsets = [];
      for (const j of [i - 1, i])
        if (j >= 0 && j < full.length - 1) {
          const u = full[j]!,
            v = full[j + 1]!,
            r = d.roads.find(
              (r) =>
                (r.a === u.id && r.b === v.id) ||
                (!r.oneWay && r.b === u.id && r.a === v.id),
            )!;
          offsets.push(lanePoint(u, v, r, j === i ? 0 : 1));
        }
      return {
        ...p,
        x: offsets.reduce((n, p) => n + p.x, 0) / offsets.length,
        z: offsets.reduce((n, p) => n + p.z, 0) / offsets.length,
      };
    });
  const path = points.slice(1),
    start = points[0]!,
    end = points.at(-1)!;
  Object.assign(e.model.player, {
    x: start.x,
    z: start.z,
    heading: Math.atan2(path[0]!.x - start.x, path[0]!.z - start.z),
    speed: 0,
    collision: 0,
  });
  e.model.mission = {
    pickup: start,
    destination: end,
    passenger: "Chinatown route certification",
    limit: 100000,
  };
  Object.assign(e.model.snapshot, {
    stage: "delivery",
    target: end,
    tripTime: 100000,
    boarding: 0,
  });
  let index = 0,
    metres = 0,
    frames = 0,
    indicatorFrames = 0;
  const physical = {
      static: 0,
      prop: 0,
      bridge: 0,
      traffic: 0,
      water: 0,
      boundary: 0,
    },
    events: any[] = [],
    trace: any[] = [];
  for (
    let step = 0;
    step < 100000 && e.model.snapshot.deliveries === 0;
    step++
  ) {
    const p = e.model.player;
    let q = path[index]!,
      distance = Math.hypot(q.x - p.x, q.z - p.z);
    while (distance < 5 && index < path.length - 1) {
      q = path[++index]!;
      distance = Math.hypot(q.x - p.x, q.z - p.z);
    }
    const angle = Math.atan2(q.x - p.x, q.z - p.z) - p.heading,
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
    metres += Math.hypot(p.x - x, p.z - z);
    frames++;
    if (p.collision) indicatorFrames++;
    const categories = new Set<keyof typeof physical>();
    for (const c of contacts) {
      const id = c.obstacle?.environmentId ?? c.obstacle?.landmarkId ?? "",
        kind =
          c.kind !== "static"
            ? c.kind
            : id.startsWith("bridge-rail:")
              ? "bridge"
              : c.obstacle?.artRole === "furniture"
                ? "prop"
                : "static";
      categories.add(kind);
      if (events.length < 60)
        events.push({
          frame: step,
          kind,
          id,
          x: c.x,
          z: c.z,
          trafficId: c.trafficId,
        });
    }
    categories.forEach((k) => physical[k]++);
    if (step % 30 === 0) trace.push({ x: p.x, z: p.z });
  }
  const r = {
    id: from + ">" + to,
    complete: e.model.snapshot.deliveries === 1,
    metres: Math.round(metres),
    frames,
    indicatorFrames,
    physical,
    events,
    trace,
  };
  results.push(r);
  console.log(JSON.stringify({ ...r, events: undefined, trace: undefined }));
}
e.dispose();
const report = {
  pass: results.every(
    (r) =>
      r.complete &&
      r.physical.static +
        r.physical.prop +
        r.physical.bridge +
        r.physical.water +
        r.physical.boundary ===
        0,
  ),
  traffic,
  lanes,
  seed: 26,
  noMidRouteTeleports: true,
  method:
    "Each independent journey begins at a real road stop; all travel, turns and arrivals use the unchanged production controller at 60Hz.",
  results,
};
fs.writeFileSync(
  new URL(
    `../../../docs/qa/chinatown-reconstruction/${lanes ? "left-lane" : traffic ? "traffic" : "static"}-routes.json`,
    import.meta.url,
  ),
  JSON.stringify(report, null, 2),
);
assert(
  report.pass,
  "All Chinatown journeys must complete with zero static-world contacts; traffic contacts reported separately",
);
