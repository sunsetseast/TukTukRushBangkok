import assert from "node:assert/strict";
import fs from "node:fs";
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import("../src/game/engine");
const { routeFromPoint } = await import("../src/game/bangkok/world");
const { planConvenienceStores } =
  await import("../src/game/bangkok/convenienceStores");
const pairs = [
  ["mbk", "paragon"],
  ["paragon", "central"],
  ["central", "park"],
  ["paragon", "victory"],
  ["asok-intersection", "terminal"],
  ["river-city", "oriental"],
  ["oriental", "shangri"],
  ["icon", "hilton"],
  ["pho", "flowers"],
  ["swing-approach", "swing"],
  ["jim-thompson", "mbk"],
  ["park", "benjakitti"],
];
const e = new GameEngine({ seed: 26 }),
  d = e.model.district,
  results = [];
let total = 0;
for (const [from, to] of pairs) {
  e.start("free");
  e.model.traffic.length = 0;
  const stop = (id: string) => {
    if (id === "asok-intersection")
      return d.nodes.reduce((best, n) =>
        Math.hypot(n.x - 1780, n.z + 200) <
        Math.hypot(best.x - 1780, best.z + 200)
          ? n
          : best,
      );
    if (id === "swing-approach")
      return d.nodes.reduce((best, n) =>
        Math.hypot(n.x + 360, n.z + 800) <
        Math.hypot(best.x + 360, best.z + 800)
          ? n
          : best,
      );
    return d.nodes.find(
      (n) => n.id === d.landmarks.find((l) => l.id === id)!.accessNode,
    )!;
  };
  const a = stop(from!),
    b = stop(to!);
  const path = routeFromPoint(d, a, b).slice(1);
  assert(path.length, `${from} → ${to} connected`);
  Object.assign(e.model.player, {
    x: a.x,
    z: a.z,
    heading: Math.atan2(path[0]!.x - a.x, path[0]!.z - a.z),
    speed: 0,
    collision: 0,
  });
  e.model.mission = {
    pickup: a,
    destination: b,
    passenger: "Architecture QA",
    limit: 100000,
  };
  Object.assign(e.model.snapshot, {
    stage: "delivery",
    target: b,
    tripTime: 100000,
    boarding: 0,
  });
  let index = 0,
    hits = 0,
    metres = 0,
    frames = 0;
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
    e.update(1 / 60);
    metres += Math.hypot(p.x - x, p.z - z);
    if (p.collision) hits++;
    frames++;
  }
  assert.equal(
    e.model.snapshot.deliveries,
    1,
    `${from} → ${to} must complete via actual controller`,
  );
  assert.equal(hits, 0, `${from} → ${to} static collision`);
  total += metres;
  results.push({
    from,
    to,
    metres: Math.round(metres),
    simulatedSeconds: Math.round(frames / 60),
    collisionFrames: hits,
    controllerDriven: true,
    setupOnlyAtStart: true,
  });
}
e.dispose();
const out = {
  pass: true,
  trafficDisabledForDeterminism: true,
  metres: Math.round(total),
  routes: results,
};
fs.writeFileSync(
  new URL(
    "../../../docs/qa/city-completion/driven-routes.json",
    import.meta.url,
  ),
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out));

// Closed public-space drives use the same physical controller as fares. Only
// the initial state is placed; each subsequent position is earned by inputs.
const { VehicleController, createVehicle } =
  await import("../src/game/vehicle");
const { routeBetween } = await import("../src/game/world");
const at = ([x, y]: number[]) =>
  d.nodes.reduce((a, n) =>
    Math.hypot(n.x - (x! - 500) * 4, n.z - (y! - 600) * 4) <
    Math.hypot(a.x - (x! - 500) * 4, a.z - (y! - 600) * 4)
      ? n
      : a,
  );
const loops = [];
for (const [name, design] of [
  [
    "Lumphini perimeter",
    [
      [750, 650],
      [855, 650],
      [855, 810],
      [766, 763],
      [750, 650],
    ],
  ],
  [
    "Wireless vehicle gate / parking",
    [
      [855, 650],
      [855, 694],
      [847, 694],
      [847, 666],
      [855, 666],
      [855, 650],
    ],
  ],
] as const) {
  const anchors = design.map((p) => at([...p])),
    path = anchors
      .slice(1)
      .flatMap((n, i) => routeBetween(d, anchors[i]!.id, n.id).slice(1)),
    player = createVehicle(d),
    controller = new VehicleController();
  Object.assign(player, {
    x: anchors[0]!.x,
    z: anchors[0]!.z,
    heading: Math.atan2(path[0]!.x - anchors[0]!.x, path[0]!.z - anchors[0]!.z),
    speed: 0,
    collision: 0,
  });
  let goalIndex = 0,
    hits = 0,
    metres = 0,
    frames = 0;
  for (; frames < 60000 && goalIndex < path.length; frames++) {
    const p = path[goalIndex]!,
      dist = Math.hypot(p.x - player.x, p.z - player.z);
    if (dist < 3.2) {
      goalIndex++;
      continue;
    }
    const a = Math.atan2(p.x - player.x, p.z - player.z) - player.heading,
      error = Math.atan2(Math.sin(a), Math.cos(a)),
      speed = Math.abs(error) > 0.3 ? 4 : 7,
      old = { x: player.x, z: player.z };
    controller.update(
      player,
      {
        steer: Math.max(-1, Math.min(1, -error * 2.5)),
        gas: player.speed < speed,
        brake: player.speed > speed + 0.4,
      },
      d,
      [],
      1 / 60,
    );
    metres += Math.hypot(player.x - old.x, player.z - old.z);
    if (player.collision) hits++;
  }
  assert.equal(goalIndex, path.length, `${name} complete closed route`);
  assert.equal(hits, 0, `${name} static collisions`);
  loops.push({
    name,
    metres: Math.round(metres),
    seconds: Math.round(frames / 60),
    collisionFrames: hits,
    controllerDriven: true,
    setupOnlyAtStart: true,
  });
}
const final = { ...out, publicSpaceLoops: loops };
fs.writeFileSync(
  new URL(
    "../../../docs/qa/city-completion/driven-routes.json",
    import.meta.url,
  ),
  JSON.stringify(final, null, 2),
);
console.log(JSON.stringify({ publicSpaceLoops: loops }));
