import assert from 'node:assert/strict';
// Browser event bindings are irrelevant to this deterministic simulation, not to UI QA.
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import('../src/game/engine');
const engine = new GameEngine();
engine.start('shift');
// Isolate path/controller/mission integration from unpredictable traffic encounters.
// No position teleporting: every metre below is driven through VehicleController.
engine.model.traffic.length = 0;
const d = engine.model.district;
const nodes = new Map<string, { id: string; x: number; z: number }>(d.nodes.map((n: { id: string }) => [n.id, n]));
function route(start: string, end: string) {
  const queue = [start], prev = new Map<string, string | null>([[start, null]]);
  for (const id of queue) {
    if (id === end) break;
    for (const r of d.roads) {
      const next = r.a === id ? r.b : r.b === id ? r.a : null;
      if (next && !prev.has(next)) { prev.set(next, id); queue.push(next); }
    }
  }
  const out: { x: number; z: number }[] = []; let id: string | null = end;
  while (id) { out.unshift(nodes.get(id)!); id = prev.get(id) ?? null; }
  return out;
}
let frames = 0, metres = 0, hits = 0;
function drive(points: { x: number; z: number }[], expectedStage: string) {
  let i = 0;
  for (let step = 0; step < 5400 && engine.model.snapshot.stage === expectedStage && !engine.model.snapshot.deliveries; step++) {
    const m = engine.model, p = m.player;
    let target = points[i]!;
    let dist = Math.hypot(target.x - p.x, target.z - p.z);
    while (dist < 7 && i < points.length - 1) { target = points[++i]!; dist = Math.hypot(target.x - p.x, target.z - p.z); }
    const angle = Math.atan2(target.x - p.x, target.z - p.z) - p.heading;
    const err = Math.atan2(Math.sin(angle), Math.cos(angle));
    const last = i === points.length - 1;
    const stop = last && dist < 7.6;
    const desired = last && dist < 18 ? 4 : Math.abs(err) > .55 ? 7 : 12;
    Object.assign(m.input, { steer: stop ? 0 : Math.max(-1, Math.min(1, -err * 2.1)), gas: !stop && p.speed < desired, brake: stop ? p.speed > .5 : p.speed > desired + 2 });
    const x = p.x, z = p.z;
    engine.update(1 / 60); frames++;
    metres += Math.hypot(p.x - x, p.z - z);
    if (p.collision) hits++;
    if (m.snapshot.phase !== 'playing') break;
  }
}
drive([...route('yaowarat:2', engine.model.mission.pickup.id).slice(1), engine.model.mission.pickup], 'pickup');
assert.equal(engine.model.snapshot.stage, 'delivery', 'Driven pickup failed');
drive([...route(engine.model.mission.pickup.id, engine.model.mission.destination.id).slice(1), engine.model.mission.destination], 'delivery');
assert.equal(engine.model.snapshot.deliveries, 1, `Driven delivery failed after ${frames / 60}s`);
assert(engine.model.snapshot.earnings > 0 && engine.model.snapshot.score > 0);
assert(metres > 200, 'Route was not genuinely driven');
assert.equal(hits, 0, 'Road/controller footprint misalignment');
const time = engine.model.snapshot.shiftTime;
engine.pause(); engine.update(.05); assert.equal(engine.model.snapshot.shiftTime, time);
engine.recover(); assert.equal(engine.model.snapshot.phase, 'paused');
engine.resume(); assert.equal(engine.model.snapshot.phase, 'playing');
engine.restart(); assert.equal(engine.model.snapshot.deliveries, 0);
engine.start('free'); engine.update(.05); assert.equal(engine.model.snapshot.shiftTime, 180);
engine.dispose();
console.log(JSON.stringify({ pass: true, actualDrivenDelivery: true, noTeleports: true, trafficDisabledForDeterminism: true, metres: Math.round(metres), simulatedSeconds: frames / 60, collisionFrames: hits, pauseResumeRestartFreeRide: true }));
