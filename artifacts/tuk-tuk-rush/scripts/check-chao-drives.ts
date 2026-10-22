import assert from "node:assert/strict";
import fs from "node:fs";
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import("../src/game/engine");
const { routeFromPoint } = await import("../src/game/bangkok/world");
let pairs=[['gate','river-city'],['river-city','oriental'],['hilton','icon'],['icon','peninsula'],['oriental','peninsula'],['peninsula','shangri'],['shangri','capella'],['capella','four-seasons'],['four-seasons','asiatique'],['asiatique','anantara'],['anantara','icon'],['pho','arun'],['pinklao-west','pinklao-east'],['memorial-west','memorial-east'],['taksin-west','taksin-east']];
const e = new GameEngine({ seed: 26 }),
  d = e.model.district,
  results = [];
const trafficMode=process.env.RIVER_TRAFFIC==='1',intersectionMode=false,waterfrontMode=false,benchmarkMode=false;
const nearest=(x:number,z:number)=>{const ids=new Set(d.roads.filter(r=>!r.destinationId&&!r.bridge).flatMap(r=>[r.a,r.b]));return d.nodes.filter(n=>ids.has(n.id)).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0]!;};
const bridgeStops=new Map<string,typeof d.nodes[number]>();
for(const corridor of ['pinklao','memorial','taksin']){const ids=new Set(d.roads.filter(r=>r.corridor===corridor).flatMap(r=>[r.a,r.b])),points=d.nodes.filter(n=>ids.has(n.id)).sort((a,b)=>a.x-b.x);bridgeStops.set(corridor+'-west',points[0]!);bridgeStops.set(corridor+'-east',points.at(-1)!);}
let total = 0;
for (const [from, to] of pairs) {
  e.start("free");
  if(!trafficMode)e.model.traffic.length = 0;
  const trafficVehicles=e.model.traffic.length;
  const stop = (id: string) => {
    if(bridgeStops.has(id))return bridgeStops.get(id)!;
    if (id === 'yaowarat-entry') {
      const r=d.roads.filter(r=>r.corridor==='yaowarat');
      return d.nodes.find(n=>n.id===r[Math.min(8,r.length-1)]!.b)!;
    }
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
  total += metres;
  results.push({
    from,
    to,
    completed:e.model.snapshot.deliveries===1,
    pass:e.model.snapshot.deliveries===1&&(trafficMode||hits===0),
    metres: Math.round(metres),
    simulatedSeconds: Math.round(frames / 60),
    collisionFrames: hits,
    controllerDriven: true,
    setupOnlyAtStart: true,
    trafficVehicles,
  });
}
e.dispose();
const out = {
  benchmarkMode,
  seed:26,
  pass: results.every(r=>r.pass),
  trafficDisabledForDeterminism: !trafficMode,
  trafficEnabled: trafficMode,
  metres: Math.round(total),
  routes: results,
  intersectionArms:undefined,
};
fs.writeFileSync(
  new URL(
    `../../../docs/qa/chao-phraya/${process.env.RIVER_ROUTE_LABEL??'after'}-${trafficMode?'traffic':'static'}-routes.json`,
    import.meta.url,
  ),
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out));

if(!out.pass)process.exitCode=1;
