import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { GeographicNetwork } from "../src/game/bangkok/geographic/network";
import { createGameplayDistrict } from "../src/game/bangkok/geographic/places";
import { GameEngine } from "../src/game/engine";
import { guidanceFor } from "../src/game/navigation";
import { CareerStore, CAREER_KEY } from "../src/game/career";
import { VehicleController, createVehicle } from "../src/game/vehicle";
import { obstacleDistance } from "../src/game/world";
import { buildMigratedArt } from "../src/game/bangkok/geographic/migratedArt";
import { geographicToMeters } from "../src/game/bangkok/geographic/projection";
const dir = new URL("../public/assets/geography/", import.meta.url),
  raw = gunzipSync(fs.readFileSync(new URL("navigation.v2.bin.gz", dir))),
  metadata = JSON.parse(
    gunzipSync(fs.readFileSync(new URL("gameplay.v2.json.gz", dir))).toString(),
  );
const start = performance.now(),
  network = new GeographicNetwork(
    metadata,
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
  ),
  { district, places } = createGameplayDistrict(network),
  initMs = performance.now() - start;
class Memory {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
const storage = new Memory(),
  career = new CareerStore(storage as any);
career.syncDiscovery(["oldtown"], ["palace"]);
career.flush();
const previous = JSON.parse(storage.getItem(CAREER_KEY)!);
// Geometry can be validated without browser-only sign rasterization.
const art = places.map(buildMigratedArt);
Object.assign(globalThis, {
  window: {
    localStorage: storage,
    addEventListener() {},
    removeEventListener() {},
  },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const engine = new GameEngine({ district, seed: 47 });
engine.start("free");
assert.equal(
  engine.model.traffic.length,
  0,
  "No synthetic traffic implementation in preview",
);
assert.equal(district.nodes.length, 4, "No duplicate full-city District graph");
assert.deepEqual(engine.career.profile.landmarks, previous.landmarks);
assert.deepEqual(engine.career.profile.districts, previous.districts);
district.obstacles = art.map((a) => a.obstacle);
district.buildings = district.obstacles;
// Every pair must use actual connected edges; the opposite bank must use a real bridge.
for (const a of network.stops)
  for (const b of network.stops) {
    const path = network.path(a, b);
    assert(path.length);
    for (const q of path.slice(2))
      assert("id" in q, "Source graph vertices retained");
  }
const riverRoute = guidanceFor(
  district,
  network.stops[0]!,
  0,
  network.stops[3]!,
);
assert(riverRoute.distance! > 4000);
assert(
  riverRoute.path.some(
    (p) =>
      (p as any).id?.startsWith("geo:") &&
      network.y[Number((p as any).id.slice(4))]! > 1,
  ),
  "Bridge-layer source nodes occur on cross-river route",
);
// Asset envelopes cannot intrude on ANY player surface (including disconnected compounds).
for (const { obstacle } of art) {
  for (let i = 0; i < network.a.length; i++) {
    const a = network.node(network.a[i]!),
      b = network.node(network.b[i]!);
    if (
      Math.min(a.x, b.x) > obstacle.x + obstacle.w / 2 + 100 ||
      Math.max(a.x, b.x) < obstacle.x - obstacle.w / 2 - 100 ||
      Math.min(a.z, b.z) > obstacle.z + obstacle.d / 2 + 100 ||
      Math.max(a.z, b.z) < obstacle.z - obstacle.d / 2 - 100
    )
      continue;
    const count = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z));
    for (let k = 0; k <= count; k++) {
      const t = count ? k / count : 0,
        p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      assert(
        obstacleDistance(p, obstacle) >= network.width[i]! / 2 - 0.05,
        `${obstacle.landmarkId} overlaps road`,
      );
    }
  }
}
let frames = 0,
  metres = 0,
  hits = 0;
const crossed = new Set<string>();
function drive(expected: "pickup" | "delivery") {
  const target = engine.model.snapshot.target,
    points = network.path(engine.model.player, target);
  assert(points.length);
  let i = 1;
  for (
    let step = 0;
    step < 90000 &&
    engine.model.snapshot.stage === expected &&
    !engine.model.snapshot.deliveries;
    step++
  ) {
    const p = engine.model.player;
    let q = points[i]!,
      dist = Math.hypot(q.x - p.x, q.z - p.z);
    while (dist < 3.2 && i < points.length - 1) {
      q = points[++i]!;
      dist = Math.hypot(q.x - p.x, q.z - p.z);
    }
    const angle = Math.atan2(q.x - p.x, q.z - p.z) - p.heading,
      err = Math.atan2(Math.sin(angle), Math.cos(angle)),
      last = i === points.length - 1,
      stop = last && dist < 6;
    const desired = last && dist < 18 ? 3 : Math.abs(err) > 0.7 ? 3.5 : 8;
    Object.assign(engine.model.input, {
      steer: stop ? 0 : Math.max(-1, Math.min(1, -err * 2.5)),
      gas: !stop && p.speed < desired,
      brake: stop ? p.speed > 0.3 : p.speed > desired + 1,
    });
    const x = p.x,
      z = p.z;
    engine.update(1 / 60);
    frames++;
    metres += Math.hypot(p.x - x, p.z - z);
    if (p.collision) hits++;
    crossed.add(`${Math.floor(p.x / 1024)}:${Math.floor(p.z / 1024)}`);
  }
}
drive("pickup");
assert.equal(
  engine.model.snapshot.stage,
  "delivery",
  "Production boarding after driving pickup",
);
drive("delivery");
assert.equal(
  engine.model.snapshot.deliveries,
  1,
  `Driven geographic delivery failed: ${JSON.stringify({ position: engine.model.player, target: engine.model.snapshot.target, metres, hits })}`,
);
assert(metres > 300);
assert(engine.model.snapshot.earnings > 0);
assert.equal(engine.career.profile.wallet, engine.model.snapshot.wallet);
assert.equal(engine.career.profile.fares, 1);
const saved = new CareerStore(storage as any);
assert.equal(saved.profile.wallet, engine.career.profile.wallet);
assert.deepEqual(saved.profile.landmarks, previous.landmarks);
const before = engine.model.snapshot.tripTime;
engine.pause();
engine.update(0.05);
assert.equal(engine.model.snapshot.tripTime, before);
engine.resume();
assert.equal(engine.model.snapshot.phase, "playing");
// Long-distance navigation is independent of any render chunk requests.
const distant = network.access(
    geographicToMeters({ lon: 100.55379, lat: 13.8026 }),
    network.stops[0]!,
  ),
  far = network.node(network.a[distant.edge]!);
assert(network.path(network.stops[0]!, far).length > 50);
const queryStart = performance.now();
for (let i = 0; i < 1000; i++)
  network.nearest({ x: district.spawn!.x + (i % 20), z: district.spawn!.z });
const queryMs = performance.now() - queryStart;
const stations = metadata.rail.stations,
  sala = stations.find((s: any) => s.tags.ref === "S2"),
  silom = stations.find((s: any) => s.tags.ref === "BL26");
assert.deepEqual(sala.lines, ["silom"]);
assert.deepEqual(silom.lines, ["blue"]);
assert.equal(silom.level, "underground");
assert(silom.height < 0);
assert(
  metadata.rail.transfers.some(
    (t: any) =>
      [t.from, t.to].includes(sala.id) &&
      [t.from, t.to].includes(silom.id) &&
      t.sharedMembers.length,
  ),
);
// Drive an actual source bridge profile from its ground approach over water.
const source = JSON.parse(
  gunzipSync(fs.readFileSync(new URL("runtime.v1.json.gz", dir))).toString(),
);
const bridge = source.roads.find((r: any) => r.id === "osm:way/28152385");
assert(
  bridge.profiles?.flat().some((p: number[]) => p[2]! > 6),
  "Two-node river bridge has an interior raised deck",
);
const profile = bridge.profiles[0] as number[][],
  first = profile[0]!,
  last = profile.at(-1)!,
  vehicle = {
    ...createVehicle(district),
    x: first[0]!,
    z: first[1]!,
    heading: Math.atan2(last[0]! - first[0]!, last[1]! - first[1]!),
  },
  controller = new VehicleController();
network.reset(vehicle);
let deckHeight = 0,
  bridgeDistance = 0;
for (
  let i = 0;
  i < 6000 && Math.hypot(vehicle.x - last[0]!, vehicle.z - last[1]!) > 3;
  i++
) {
  const old = { x: vehicle.x, z: vehicle.z };
  controller.update(
    vehicle,
    { gas: vehicle.speed < 7, brake: false, steer: 0 },
    district,
    [],
    1 / 60,
  );
  deckHeight = Math.max(deckHeight, network.height);
  bridgeDistance += Math.hypot(old.x - vehicle.x, old.z - vehicle.z);
  assert(
    !vehicle.collision,
    "River bridge remains physically continuous, with no water/deck collision",
  );
}
assert(deckHeight > 6);
assert(
  Math.hypot(vehicle.x - last[0]!, vehicle.z - last[1]!) < 3,
  "Controller reaches far bank of source bridge",
);
assert(bridgeDistance > 200);
// Three production-engine seam crossings retain active fare/player/wallet state.
const seams: object[] = [];
for (let e = 0; e < network.a.length && seams.length < 3; e++) {
  const a = network.node(network.a[e]!),
    b = network.node(network.b[e]!),
    length = Math.hypot(b.x - a.x, b.z - a.z);
  if (
    length < 45 ||
    network.width[e]! < 10 ||
    network.y[network.a[e]!] !== 0 ||
    network.y[network.b[e]!] !== 0
  )
    continue;
  for (const axis of ["x", "z"] as const) {
    if (Math.floor(a[axis] / 1024) === Math.floor(b[axis] / 1024)) continue;
    const boundary = (Math.floor(Math.min(a[axis], b[axis]) / 1024) + 1) * 1024,
      t = (boundary - a[axis]) / (b[axis] - a[axis]);
    if (t * length < 12 || (1 - t) * length < 25) continue;
    engine.start("free");
    Object.assign(engine.model.player, {
      x: a.x + (b.x - a.x) * (t - 8 / length),
      z: a.z + (b.z - a.z) * (t - 8 / length),
      heading: Math.atan2(b.x - a.x, b.z - a.z),
    });
    network.reset(engine.model.player);
    const p = engine.model.player,
      old = p[axis],
      mission = engine.model.mission,
      wallet = engine.career.profile.wallet;
    Object.assign(engine.model.input, { gas: true, brake: false, steer: 0 });
    for (let k = 0; k < 95; k++) engine.update(1 / 60);
    if (p.collision || Math.floor(old / 1024) === Math.floor(p[axis] / 1024))
      continue;
    assert.strictEqual(engine.model.player, p);
    assert.strictEqual(engine.model.mission, mission);
    assert.equal(engine.career.profile.wallet, wallet);
    assert(p.speed > 0);
    seams.push({ edge: e, axis, speed: p.speed });
    break;
  }
}
assert.equal(seams.length, 3);
const waterAnchor = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../../data/bangkok/real-scale/anchors.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
).find((p: any) => p.id === "water:icon");
assert(waterAnchor);
const wet = geographicToMeters(waterAnchor);
network.reset(wet);
assert(
  network.blocked(wet, wet),
  "Real river bank prevents entry without a bridge",
);
// Every streamed support must clear the connected ground-road vehicle envelope.
let supports = 0;
for (const ref of metadata.chunks) {
  const c = JSON.parse(
    gunzipSync(fs.readFileSync(new URL(ref.file, dir))).toString(),
  );
  for (const s of c.supports ?? []) {
    const q = network.nearest({ x: s.point[0], z: s.point[1] }, 0);
    assert(
      q.distance >= network.width[q.edge]! / 2 + 2.1,
      "Rail pier obstructs a road",
    );
    supports++;
  }
}
// New navigation retains all implementable source ways, excluding unavailable tunnels.
const ids = new Set(metadata.ways.map((w: any) => w.id));
for (const r of source.roads)
  if (r.tunnel || r.tags.highway === "steps" || r.tags.area === "yes")
    assert(
      !ids.has(r.id),
      `Unavailable physical surface in player graph: ${r.id}`,
    );
for (const r of source.roads)
  if (
    !r.tunnel &&
    r.tags.highway !== "steps" &&
    r.tags.area !== "yes" &&
    r.width >= 3
  )
    assert(ids.has(r.id), "No physically eligible street omitted");
// A tagged narrow passage fits the unchanged envelope; crossing layers stay separate.
const fixtureBuffer = new ArrayBuffer(16 + 4 * 12 + 2 * 16);
new Uint32Array(fixtureBuffer, 0, 4).set([0x47454f32, 4, 2, 1]);
let fixtureOffset = 16;
for (const values of [
  [-20, 20, 0, 0],
  [0, 0, -20, 20],
  [0, 0, 7, 7],
]) {
  new Float32Array(fixtureBuffer, fixtureOffset, 4).set(values);
  fixtureOffset += 16;
}
for (const [values, floating] of [
  [[0, 2], false],
  [[1, 3], false],
  [[3.2, 8], true],
  [[0, 1], false],
] as const) {
  const array = floating
    ? new Float32Array(fixtureBuffer, fixtureOffset, 2)
    : new Uint32Array(fixtureBuffer, fixtureOffset, 2);
  array.set(values);
  fixtureOffset += 8;
}
const fixture = new GeographicNetwork(
  {
    ...metadata,
    nodeCount: 4,
    edgeCount: 2,
    waterUnion: [],
    ways: [
      { id: "tagged-footway", name: "Physically passable footway" },
      { id: "bridge", name: "Separate elevated crossing" },
    ],
  },
  fixtureBuffer,
);
assert(fixture.surface({ x: 0, z: 0.09 }, 0));
assert(!fixture.surface({ x: 0, z: 0.11 }, 0));
assert.equal(fixture.surface({ x: 0, z: 0 }, 0)!.height, 0);
assert.equal(fixture.surface({ x: 0, z: 0 }, 7)!.height, 7);
assert.deepEqual(
  fixture.path(fixture.node(0), fixture.node(2)),
  [],
  "Crossing X/Z never welds independent layers",
);
engine.dispose();

const report = {
  pass: true,
  bridgeDistance,
  deckHeight,
  seams,
  supports,
  initMs,
  allocatedTypedBytes: network.allocatedBytes,
  query1000Ms: queryMs,
  queries: network.queries,
  examinedSegments: network.examined,
  metres: Math.round(metres),
  simulatedSeconds: frames / 60,
  collisionFrames: hits,
  visitedChunks: [...crossed],
  actualDrivenDelivery: true,
  teleports: false,
  productionRewards: true,
  legacyProgressPreserved: true,
  distantRouteNodes: network.path(network.stops[0]!, far).length,
  places: places.map((p) => ({
    id: p.landmark.id,
    coordinate: p.coordinate,
    accessWay: p.accessWay,
    accessNode: p.stop.id,
    radius: p.radius,
    sources: p.sources,
  })),
};
const out = new URL("../../../docs/qa/geographic-gameplay/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  new URL("gameplay-tests.json", out),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
