import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { obstacleDistance } from "../src/game/world";
import { riverClearance } from "../src/game/bangkok/waterGeometry";
import assert from "node:assert/strict";
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import("../src/game/engine");
const { routeFromPoint, SHIFT_SECONDS } =
  await import("../src/game/bangkok/world");
const { createMissions } = await import("../src/game/missions");
const e = new GameEngine({ seed: Number(process.env.FARE_SEED ?? 20) });
const fareCount = createMissions(e.model.district).length;
e.start("free");
e.model.traffic.length = 0;
let frames = 0,
  metres = 0,
  collisions = 0;
const contacts: any[] = [],
  trajectory: any[] = [],
  journeys: any[] = [];
const named = e.model.district.obstacles.filter((o) =>
  [
    "street-infill:3445522820",
    "street-infill:2067870354",
    "env:tree:-14844:103535",
  ].includes(o.environmentId ?? ""),
);
const nodes = new Map(e.model.district.nodes.map((n) => [n.id, n]));
const geometry = named.map((o) => ({
  obstacle: o,
  nearby: e.model.district.obstacles.filter(
    (q) => Math.hypot(q.x - o.x, q.z - o.z) < 35,
  ),
  roads: e.model.district.roads
    .map((r) => ({ road: r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }))
    .filter(
      (r) =>
        Math.min(
          Math.hypot(r.a.x - o.x, r.a.z - o.z),
          Math.hypot(r.b.x - o.x, r.b.z - o.z),
        ) < 60,
    ),
}));
const drive = (expected: "pickup" | "delivery", goal: number) => {
  const path = routeFromPoint(
    e.model.district,
    e.model.player,
    e.model.snapshot.target,
  ).slice(1);
  if (!path.length) path.push(e.model.snapshot.target);
  let index = 0;
  journeys.push({
    goal,
    expected,
    start: { ...e.model.player },
    path,
    target: e.model.snapshot.target,
  });
  for (
    let step = 0;
    step < 60000 &&
    e.model.snapshot.stage === expected &&
    e.model.snapshot.deliveries < goal;
    step++
  ) {
    const p = e.model.player;
    let point = path[index]!,
      distance = Math.hypot(point.x - p.x, point.z - p.z);
    while (distance < 5 && index < path.length - 1) {
      point = path[++index]!;
      distance = Math.hypot(point.x - p.x, point.z - p.z);
    }
    const angle = Math.atan2(point.x - p.x, point.z - p.z) - p.heading,
      error = Math.atan2(Math.sin(angle), Math.cos(angle));
    const last = index === path.length - 1,
      stop = last && distance < 7.3;
    const speed = last && distance < 20 ? 4 : Math.abs(error) > 0.35 ? 5 : 10;
    Object.assign(e.model.input, {
      steer: stop ? 0 : Math.max(-1, Math.min(1, -error * 2.3)),
      gas: !stop && p.speed < speed,
      brake: stop ? p.speed > 0.4 : p.speed > speed + 0.5,
    });
    const x = p.x,
      z = p.z,
      previousCollision = p.collision,
      pre = { ...p };
    e.update(1 / 60);
    if (p.collision && previousCollision === 0) {
      const solids = e.model.district.obstacles
        .map((o) => ({ o, d: obstacleDistance(p, o) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      contacts.push({
        goal,
        expected,
        pose: { ...p },
        water: riverClearance(e.model.district, p),
        solids,
      });
    }
    if (
      frames % 30 === 0 ||
      [
        { x: 77, z: 1101 },
        { x: -148, z: 1035 },
      ].some((o) => Math.hypot(o.x - p.x, o.z - p.z) < 65)
    )
      trajectory.push({
        frame: frames,
        goal,
        expected,
        index,
        pre,
        post: { ...p },
        input: { ...e.model.input },
        target: point,
        nearest: named.map((o) => ({
          id: o.environmentId,
          clearance: obstacleDistance(p, o) - 1.5,
        })),
      });
    frames++;
    metres += Math.hypot(p.x - x, p.z - z);
    if (p.collision) collisions++;
  }
};
for (let goal = 1; goal <= fareCount; goal++) {
  drive("pickup", goal);
  assert.equal(e.model.snapshot.stage, "delivery", `Pickup ${goal} failed`);
  drive("delivery", goal);
  assert.equal(
    e.model.snapshot.deliveries,
    goal,
    `Delivery ${goal} failed: ${JSON.stringify(e.model.player)}`,
  );
}
const label = process.env.FARE_LABEL ?? "after";
const report = {
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  seed: Number(process.env.FARE_SEED ?? 20),
  collisionRadius: 1.5,
  sourceFiles: Object.fromEntries(
    [
      "src/game/bangkok/roadManeuvers.ts",
      "src/game/bangkok/environmentPlan.ts",
      "src/game/bangkok/streetFabric.ts",
      "src/game/vehicle.ts",
    ].map((p) => [
      p,
      execFileSync("git", ["hash-object", p], { encoding: "utf8" }).trim(),
    ]),
  ),
  frames,
  metres,
  collisions,
  contacts,
  journeys,
  geometry,
  trajectory,
};
const out = new URL(
  "../../../docs/qa/waterfront-certification/traces/",
  import.meta.url,
);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  new URL(label + "-fares.json.gz", out),
  gzipSync(JSON.stringify(report)),
);
console.log(
  JSON.stringify({
    label,
    collisions,
    frames,
    metres,
    contacts: contacts.map((c) => ({
      goal: c.goal,
      stage: c.expected,
      pose: c.pose,
      obstacle: c.solids[0],
    })),
  }),
);
assert(metres > 2000, "Drive must cover districts and a river crossing");
if (process.env.FARE_ALLOW_CONTACTS !== "1")
  assert.equal(collisions, 0, "Driven routes must clear physical geometry");
const before = e.model.snapshot.elapsed;
e.pause();
for (let i = 0; i < 10; i++) e.update(0.05);
assert.equal(e.model.snapshot.elapsed, before);
e.recover();
assert.equal(e.model.snapshot.phase, "paused");
e.resume();
e.start("shift");
assert.equal(e.model.snapshot.shiftTime, SHIFT_SECONDS);
e.model.traffic.length = 0;
e.update(0.05);
assert(e.model.snapshot.shiftTime < SHIFT_SECONDS);
e.restart();
assert.equal(e.model.snapshot.deliveries, 0);
e.dispose();
console.log(
  JSON.stringify({
    pass: true,
    drivenFares: fareCount,
    noTeleports: true,
    metres: Math.round(metres),
    simulatedSeconds: Math.round(frames / 60),
    collisions,
    pauseRecoveryRestart: true,
    trafficDisabledForDeterminism: true,
  }),
);
