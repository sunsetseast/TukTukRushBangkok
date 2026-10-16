import assert from 'node:assert/strict';
import { CareerStore, CAREER_KEY, rankFor, validateCareer } from '../src/game/career';
import { GameEngine } from '../src/game/engine';
class Memory {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
const storage = new Memory();
storage.setItem(
  'tuktuk:bangkok-discovery:v1',
  JSON.stringify({ regions: ['oldtown'], landmarks: ['palace'], shortcuts: ['canal'] }),
);
const career = new CareerStore(storage);
assert.equal(career.profile.wallet, 0);
career.syncDiscovery(['oldtown'], ['palace']);
assert.equal(career.profile.xp, 0, 'No retroactive XP or earnings');
const session = career.beginSession();
assert(career.rewardFare(session, 0, 200, 50).applied);
assert(!career.rewardFare(session, 0, 200, 50).applied);
assert.equal(career.profile.wallet, 200);
assert.equal(career.profile.fares, 1);
assert.equal(career.profile.achievements.filter((x) => x === 'first-fare').length, 1);
const reloaded = new CareerStore(storage);
assert.equal(reloaded.profile.wallet, 200);
assert(!reloaded.rewardFare(session, 0, 200, 50).applied);
assert(reloaded.rewardFare(session, 1, 100, 50).applied);
const complete = reloaded.finishShift(session, 1500, 300);
assert(complete.applied);
assert(!reloaded.finishShift(session, 1500, 300).applied);
assert(!reloaded.rewardFare(session, 2, 100, 50).applied);
const second = reloaded.beginSession();
assert(!reloaded.rewardFare(session, 3, 100, 50).applied);
reloaded.rewardFare(second, 0, 250, 50);
assert.equal(reloaded.profile.wallet, 550);
assert.equal(reloaded.profile.lifetimeEarnings, 550);
assert.equal(reloaded.profile.shifts, 1);
assert.equal(reloaded.profile.bestEarnings, 300);
for (const n of [NaN, Infinity, -1, 1.5]) assert(!reloaded.rewardFare(second, 1, n, 50).applied);
for (let i = 1; i < 28; i++) reloaded.rewardFare(second, i, 100, 50);
assert.equal(rankFor(reloaded.profile.xp).name, 'Trusted Driver');
assert.equal(new Set(reloaded.profile.achievements).size, reloaded.profile.achievements.length);
reloaded.drive(1.5);
reloaded.drive(1000);
reloaded.drive(NaN);
reloaded.flush();
assert.equal(new CareerStore(storage).profile.distance, 1.5);
const good = storage.getItem(CAREER_KEY)!;
storage.setItem(CAREER_KEY, '{bad');
const fallback = new CareerStore(storage);
assert.equal(fallback.profile.wallet, reloaded.profile.wallet);
assert.equal(fallback.status, 'recovered');
const corrupt = new Memory();
corrupt.setItem(CAREER_KEY, '{bad');
const safe = new CareerStore(corrupt);
safe.beginSession();
safe.rewardFare(1, 0, 50, 40);
assert.equal(corrupt.getItem(CAREER_KEY + ':unreadable'), '{bad');
assert.equal(safe.profile.wallet, 50);
assert.equal(safe.status, 'saved');
corrupt.setItem(CAREER_KEY, JSON.stringify({ version: 99 }));
assert.equal(new CareerStore(corrupt).status, 'protected');
const readDenied = new CareerStore({
  getItem() {
    throw Error('blocked read');
  },
  setItem() {
    throw Error('must not overwrite unreadable storage');
  },
});
readDenied.beginSession();
assert.equal(readDenied.status, 'memory');
const unavailable = new CareerStore({
  getItem() {
    throw Error('denied');
  },
  setItem() {
    throw Error('full');
  },
});
const id = unavailable.beginSession();
assert(unavailable.rewardFare(id, 0, 50, 40).applied);
assert.equal(unavailable.status, 'memory');
const writeDenied = new CareerStore({
  getItem() {
    return null;
  },
  setItem() {
    throw Error('quota');
  },
});
const volatile = writeDenied.beginSession();
writeDenied.rewardFare(volatile, 0, 75, 40);
assert.equal(writeDenied.profile.wallet, 75);
assert.equal(writeDenied.status, 'memory');
assert(!validateCareer({ ...JSON.parse(good), wallet: -1 }));
assert(!validateCareer({ ...JSON.parse(good), xp: NaN }));
Object.assign(globalThis, {
  window: {
    localStorage: storage,
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false }),
  },
  document: { hidden: false, addEventListener() {}, removeEventListener() {} },
});
const e = new GameEngine({ seed: 21 });
const original = storage.getItem('tuktuk:bangkok-discovery:v1');
assert.equal(
  original,
  JSON.stringify({ regions: ['oldtown'], landmarks: ['palace'], shortcuts: ['canal'] }),
);
e.start('free');
e.model.traffic = [];
const deliver = () => {
  const m = e.model,
    s = m.snapshot;
  Object.assign(m.player, { x: m.mission.destination.x, z: m.mission.destination.z, speed: 0 });
  Object.assign(s, {
    stage: 'delivery',
    target: m.mission.destination,
    tripTime: m.mission.limit,
    boarding: 0.99,
  });
  e.update(0.05);
};
const before = e.career.profile.wallet;
deliver();
assert(e.career.profile.wallet > before);
assert.equal(e.model.snapshot.deliveries, 1);
const wallet = e.career.profile.wallet;
e.pause();
e.resume();
assert.equal(e.career.profile.wallet, wallet);
e.restart();
assert.equal(e.career.profile.wallet, wallet);
const distanceBefore = e.career.profile.distance;
e.model.traffic = [];
e.model.input.gas = true;
for (let i = 0; i < 120; i++) e.update(0.05);
e.pause();
assert(
  e.career.profile.distance > distanceBefore + 5,
  'Actual vehicle movement contributes distance',
);
e.dispose();
const next = new GameEngine({ seed: 21 });
assert.equal(next.career.profile.wallet, wallet);
next.start('shift'); // Timer completion is a separate event from fare rewards.
const finalWallet = next.career.profile.wallet;
next.model.snapshot.shiftTime = 0.01;
next.update(0.05);
assert.equal(next.model.snapshot.phase, 'ended');
assert.equal(next.model.snapshot.careerXP, 100);
assert.equal(next.career.profile.shifts, 2);
next.dispose();
const third = new GameEngine({ seed: 23 });
third.start('shift');
assert.equal(third.career.profile.wallet, finalWallet);
third.model.snapshot.shiftTime = 0.01;
third.update(0.05);
assert.equal(third.career.profile.shifts, 3);
third.dispose();
console.log(
  'PASS career: accumulation, Free Roam delivery, exact-once fare/shift rewards, reload/restart, rank, achievements, validation, backup, corruption protection, unavailable storage and legacy discovery',
);
