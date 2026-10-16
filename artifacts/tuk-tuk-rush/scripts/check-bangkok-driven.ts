import assert from 'node:assert/strict';
Object.assign(globalThis, { window: { addEventListener() {}, removeEventListener() {} }, document: { addEventListener() {}, removeEventListener() {}, hidden: false } });
const { GameEngine } = await import('../src/game/engine');
const { routeFromPoint, SHIFT_SECONDS } = await import('../src/game/bangkok/world');
const {createMissions}=await import('../src/game/missions');
const e = new GameEngine({seed:20});const fareCount=createMissions(e.model.district).length; e.start('free'); e.model.traffic.length = 0;
let frames = 0, metres = 0, collisions = 0;
const drive = (expected: 'pickup' | 'delivery', goal: number) => {
  const path = routeFromPoint(e.model.district, e.model.player, e.model.snapshot.target).slice(1); if(!path.length)path.push(e.model.snapshot.target); let index = 0;
  for (let step = 0; step < 60000 && e.model.snapshot.stage === expected && e.model.snapshot.deliveries < goal; step++) {
    const p = e.model.player; let point = path[index]!, distance = Math.hypot(point.x - p.x, point.z - p.z);
    while (distance < 5 && index < path.length - 1) { point = path[++index]!; distance = Math.hypot(point.x - p.x, point.z - p.z); }
    const angle = Math.atan2(point.x - p.x, point.z - p.z) - p.heading, error = Math.atan2(Math.sin(angle), Math.cos(angle));
    const last = index === path.length - 1, stop = last && distance < 7.3;
    const speed = last && distance < 20 ? 4 : Math.abs(error) > .35 ? 5 : 10;
    Object.assign(e.model.input, { steer: stop ? 0 : Math.max(-1, Math.min(1, -error * 2.3)), gas: !stop && p.speed < speed, brake: stop ? p.speed > .4 : p.speed > speed + .5 });
    const x = p.x, z = p.z; e.update(1 / 60); frames++; metres += Math.hypot(p.x - x, p.z - z); if (p.collision) collisions++;
  }
};
for (let goal = 1; goal <= fareCount; goal++) {
  drive('pickup', goal); assert.equal(e.model.snapshot.stage, 'delivery', `Pickup ${goal} failed`);
  drive('delivery', goal); assert.equal(e.model.snapshot.deliveries, goal, `Delivery ${goal} failed: ${JSON.stringify(e.model.player)}`);
}
assert(metres > 2000, 'Drive must cover districts and a river crossing'); assert.equal(collisions, 0, 'Driven routes must clear physical geometry');
const before = e.model.snapshot.elapsed; e.pause(); for (let i = 0; i < 10; i++) e.update(.05); assert.equal(e.model.snapshot.elapsed, before); e.recover(); assert.equal(e.model.snapshot.phase, 'paused'); e.resume();
e.start('shift'); assert.equal(e.model.snapshot.shiftTime, SHIFT_SECONDS); e.model.traffic.length = 0; e.update(.05); assert(e.model.snapshot.shiftTime < SHIFT_SECONDS); e.restart(); assert.equal(e.model.snapshot.deliveries, 0); e.dispose();
console.log(JSON.stringify({ pass: true, drivenFares: fareCount, noTeleports: true, metres: Math.round(metres), simulatedSeconds: Math.round(frames / 60), collisions, pauseRecoveryRestart: true, trafficDisabledForDeterminism: true }));
